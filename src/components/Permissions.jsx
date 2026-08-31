import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getPermissions } from "../store/permissionsSlice";

export const Permissions = ({
    selectedIds = [],
    onChange, // (newSelectedIds: number[]) => void
}) => {
    const dispatch = useDispatch();
    const { permissions, loading, error } = useSelector(
        (state) => state.permissions
    );

    const [expandedPages, setExpandedPages] = React.useState({});

    useEffect(() => {
        dispatch(getPermissions());
    }, [dispatch]);

    const toggleExpansion = (page) => {
        setExpandedPages((prev) => ({
            ...prev,
            [page]: !prev[page],
        }));
    };

    // Flatten all permission IDs under a parent
    const getAllIdsOfParent = (parent) => {
        const ids = [parent.id];
        (parent.children || []).forEach((child) => ids.push(child.id));
        return ids;
    };

    const isParentFullySelected = (parent) => {
        const allIds = getAllIdsOfParent(parent);
        return allIds.every((id) => selectedIds.includes(id));
    };

    const isParentPartiallySelected = (parent) => {
        const allIds = getAllIdsOfParent(parent);
        return allIds.some((id) => selectedIds.includes(id)) && !isParentFullySelected(parent);
    };

    const toggleParent = (parent) => {
        const allIds = getAllIdsOfParent(parent);
        const fullySelected = isParentFullySelected(parent);

        let newSelected;
        if (fullySelected) {
            // Deselect all
            newSelected = selectedIds.filter((id) => !allIds.includes(id));
        } else {
            // Select all
            newSelected = [...new Set([...selectedIds, ...allIds])];
        }
        onChange(newSelected);
    };

    const toggleChild = (childId, parent) => {
        const isSelected = selectedIds.includes(childId);
        let newSelected = [...selectedIds];

        if (isSelected) {
            // Deselect child
            newSelected = newSelected.filter((id) => id !== childId);

            // If no more children of this parent are selected → also remove parent
            const siblingIds = (parent.children || []).map((c) => c.id);
            const stillHasSelectedChild = siblingIds.some((id) =>
                newSelected.includes(id)
            );

            if (!stillHasSelectedChild) {
                newSelected = newSelected.filter((id) => id !== parent.id);
            }
        } else {
            // Select child + automatically select parent
            newSelected = [...new Set([...newSelected, childId, parent.id])];
        }

        onChange(newSelected);
    };

    if (loading) {
        return (
            <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-500">
                Loading permissions...
            </div>
        );
    }

    if (error) {
        return (
            <div className="border border-red-200 rounded-lg p-4 text-sm text-red-500">
                {error}
            </div>
        );
    }

    if (!permissions?.length) {
        return (
            <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-500">
                No permissions found
            </div>
        );
    }

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            {permissions.map((parent, index) => {
                const isExpanded = expandedPages[parent.name];
                const fullySelected = isParentFullySelected(parent);
                const partiallySelected = isParentPartiallySelected(parent);
                const selectedCount = getAllIdsOfParent(parent).filter((id) =>
                    selectedIds.includes(id)
                ).length;

                return (
                    <div
                        key={parent.id}
                        className={`${index !== 0 ? "border-t border-gray-200" : ""}`}
                    >
                        {/* Parent Row */}
                        <div
                            className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 ${fullySelected || partiallySelected ? "bg-indigo-50" : ""
                                }`}
                            onClick={() => toggleExpansion(parent.name)}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">
                                    {parent.name}
                                </span>
                                {(fullySelected || partiallySelected) && (
                                    <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                                        {selectedCount} selected
                                    </span>
                                )}
                            </div>
                            {isExpanded ? (
                                <ChevronUp size={18} className="text-gray-400" />
                            ) : (
                                <ChevronDown size={18} className="text-gray-400" />
                            )}
                        </div>

                        {/* Children */}
                        {isExpanded && (
                            <div className="p-3 bg-gray-50 border-t border-gray-200">
                                <div className="mb-2">
                                    <button
                                        type="button"
                                        onClick={() => toggleParent(parent)}
                                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        {fullySelected ? "Deselect all" : "Select all"}
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {(parent.children || []).map((child) => {
                                        const isSelected = selectedIds.includes(child.id);

                                        return (
                                            <label
                                                key={child.id}
                                                className={`text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition ${isSelected
                                                        ? "bg-indigo-600 text-white border-indigo-600"
                                                        : "text-gray-700 border-gray-300 hover:bg-white"
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={isSelected}
                                                    onChange={() => toggleChild(child.id, parent)}  // ← pass parent
                                                />
                                                {child.name}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};