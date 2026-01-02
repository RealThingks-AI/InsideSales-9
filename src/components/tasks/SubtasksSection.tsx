import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export interface SubtaskItem {
  id: string;
  title: string;
  is_completed: boolean;
  order_index: number;
}

interface SubtasksSectionProps {
  subtasks: SubtaskItem[];
  onChange: (subtasks: SubtaskItem[]) => void;
  disabled?: boolean;
}

export const SubtasksSection = ({ subtasks, onChange, disabled }: SubtasksSectionProps) => {
  const [newSubtask, setNewSubtask] = useState('');

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    
    const newItem: SubtaskItem = {
      id: `temp-${Date.now()}`,
      title: newSubtask.trim(),
      is_completed: false,
      order_index: subtasks.length,
    };
    
    onChange([...subtasks, newItem]);
    setNewSubtask('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubtask();
    }
  };

  const handleRemoveSubtask = (id: string) => {
    onChange(subtasks.filter(s => s.id !== id));
  };

  const handleToggleSubtask = (id: string) => {
    onChange(subtasks.map(s => 
      s.id === id ? { ...s, is_completed: !s.is_completed } : s
    ));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(subtasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order_index for all items
    const updatedItems = items.map((item, index) => ({
      ...item,
      order_index: index,
    }));

    onChange(updatedItems);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Add a subtask..."
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="flex-1"
        />
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={handleAddSubtask}
          disabled={disabled || !newSubtask.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {subtasks.length > 0 && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="subtasks">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-1"
              >
                {subtasks.map((subtask, index) => (
                  <Draggable 
                    key={subtask.id} 
                    draggableId={subtask.id} 
                    index={index}
                    isDragDisabled={disabled}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center gap-2 p-2 rounded-md border bg-background ${
                          snapshot.isDragging ? 'shadow-md' : ''
                        }`}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab text-muted-foreground hover:text-foreground"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <Checkbox
                          checked={subtask.is_completed}
                          onCheckedChange={() => handleToggleSubtask(subtask.id)}
                          disabled={disabled}
                        />
                        <span className={`flex-1 text-sm ${subtask.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                          {subtask.title}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveSubtask(subtask.id)}
                          disabled={disabled}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {subtasks.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {subtasks.filter(s => s.is_completed).length} of {subtasks.length} completed
        </p>
      )}
    </div>
  );
};
