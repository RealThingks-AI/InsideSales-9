import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Simple in-memory cache for role
let roleCache: { userId: string; role: string; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useUserRole = () => {
  const [userRole, setUserRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchUserRole = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setUserRole('user');
      setLoading(false);
      return;
    }

    // Check cache first (unless force refresh)
    if (
      !forceRefresh &&
      roleCache &&
      roleCache.userId === user.id &&
      Date.now() - roleCache.timestamp < CACHE_TTL
    ) {
      setUserRole(roleCache.role);
      setLoading(false);
      return;
    }

    try {
      // Fetch role from user_roles table via secure RPC function
      const { data, error } = await supabase.rpc('get_user_role', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole('user');
      } else {
        const role = data || 'user';
        setUserRole(role);
        
        // Update cache
        roleCache = {
          userId: user.id,
          role,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setUserRole('user');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  // Clear cache when user changes
  useEffect(() => {
    if (!user && roleCache) {
      roleCache = null;
    }
  }, [user]);

  const refreshRole = useCallback(() => {
    return fetchUserRole(true);
  }, [fetchUserRole]);

  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';
  const canEdit = isAdmin || isManager;
  const canDelete = isAdmin;
  const canManageUsers = isAdmin;
  const canAccessSettings = isAdmin;

  return {
    userRole,
    isAdmin,
    isManager,
    canEdit,
    canDelete,
    canManageUsers,
    canAccessSettings,
    loading,
    refreshRole
  };
};
