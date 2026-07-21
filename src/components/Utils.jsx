import React from "react";

export const OrderCardSkeleton = () => {
  return (
    <div className="block rounded-2xl bg-white border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gray-200" />
          <div className="flex flex-col gap-1">
            <div className="h-4 w-16 bg-gray-200 rounded" />
            <div className="h-3 w-12 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="h-4 w-20 bg-gray-200 rounded" />
      </div>

      <div className="grid grid-cols-3 gap-y-4">
        <div className="space-y-1">
          <div className="h-4 w-16 bg-gray-200 rounded" />
          <div className="h-3 w-12 bg-gray-200 rounded" />
        </div>
        <div className="text-right space-y-1">
          <div className="h-4 w-16 bg-gray-200 rounded ml-auto" />
          <div className="h-3 w-12 bg-gray-200 rounded ml-auto" />
        </div>
        <div className="text-right invisible">
          <div className="h-4 w-12 bg-gray-200 rounded ml-auto" />
          <div className="h-3 w-10 bg-gray-200 rounded ml-auto" />
        </div>

        <div className="space-y-1">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
        </div>
        <div className="text-right space-y-1">
          <div className="h-4 w-16 bg-gray-200 rounded ml-auto" />
          <div className="h-3 w-12 bg-gray-200 rounded ml-auto" />
        </div>
        <div className="text-right space-y-1">
          <div className="h-4 w-12 bg-gray-200 rounded ml-auto" />
          <div className="h-3 w-10 bg-gray-200 rounded ml-auto" />
        </div>
      </div>

      <div className="border-t border-gray-100 mt-4 pt-3">
        <div className="h-4 w-32 bg-gray-200 rounded" />
      </div>
    </div>
  );
};

