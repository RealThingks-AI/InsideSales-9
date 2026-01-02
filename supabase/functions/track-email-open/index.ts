import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

const handler = async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const emailId = url.searchParams.get("id");

    if (!emailId) {
      console.log("No email ID provided, returning pixel only");
      return new Response(TRACKING_PIXEL, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    }

    console.log(`Tracking email open for ID: ${emailId}`);

    // Create Supabase client with service role for updating
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update email history with open tracking
    const { error } = await supabase
      .from("email_history")
      .update({
        status: "opened",
        open_count: supabase.rpc("increment_open_count", { row_id: emailId }),
        opened_at: new Date().toISOString(),
      })
      .eq("id", emailId);

    // Simple increment approach
    const { data: emailData } = await supabase
      .from("email_history")
      .select("open_count")
      .eq("id", emailId)
      .single();

    if (emailData) {
      await supabase
        .from("email_history")
        .update({
          status: "opened",
          open_count: (emailData.open_count || 0) + 1,
          opened_at: new Date().toISOString(),
        })
        .eq("id", emailId);

      console.log(`Successfully tracked open for email ${emailId}`);
    }

    // Return the tracking pixel
    return new Response(TRACKING_PIXEL, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Error tracking email open:", error);
    // Still return the pixel even on error
    return new Response(TRACKING_PIXEL, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  }
};

serve(handler);