// components/faq/FAQList.jsx
import React from "react";
import { HelpCircle } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDispatch } from "react-redux";
import { reorderFaqs, setFaqsLocally } from "../../../features/faqs/faqSlice";
import FAQItem from "./FAQItem";

const FAQList = ({
  faqs,
  expandedId,
  onToggle,
  onEdit,
  onDelete,
  onVersions,
  isLoading,
}) => {
  const dispatch = useDispatch();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = faqs.findIndex((item) => item._id === active.id);
      const newIndex = faqs.findIndex((item) => item._id === over.id);

      const newFaqs = arrayMove(faqs, oldIndex, newIndex);

      const reorderedItems = newFaqs.map((faq, index) => ({
        id: faq._id,
        order: index,
      }));

      dispatch(setFaqsLocally(newFaqs));
      dispatch(reorderFaqs(reorderedItems));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (faqs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-14 text-center">
        <HelpCircle className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={40} />
        <p className="text-slate-500 dark:text-slate-300 font-medium">No FAQs yet</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
          Click "Add FAQ" to create your first one.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-3">
        <SortableContext
          items={faqs.map((f) => f._id)}
          strategy={verticalListSortingStrategy}
        >
          {faqs.map((faq) => (
            <FAQItem
              key={faq._id}
              faq={faq}
              isExpanded={expandedId === faq._id}
              onToggle={() => onToggle(faq._id)}
              onEdit={onEdit}
              onDelete={onDelete}
              onVersions={onVersions}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
};

export default FAQList;
