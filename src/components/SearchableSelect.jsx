import { ChevronDown } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Drop-in replacement for <select>: type to filter options, arrows + Enter to pick.
// The list renders in a portal so overflow-hidden / scrolling parents don't clip it.
const SearchableSelect = ({
  name,
  value,
  options = [],
  onChange,
  disabled,
  placeholder,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? options.filter((opt) => String(opt).toLowerCase().includes(q))
      : options;
    // Empty entry at the top clears the field, like the old "Select ..." option
    return q ? matches : ["", ...matches];
  }, [options, query]);

  const updatePosition = () => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 220 && rect.top > spaceBelow;
    setPosition({
      left: rect.left,
      width: Math.max(rect.width, 180),
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 2 }
        : { top: rect.bottom + 2 }),
    });
  };

  const open = () => {
    if (disabled || isOpen) return;
    setQuery("");
    const index = filtered.indexOf(value ?? "");
    setActiveIndex(index >= 0 ? index : 0);
    updatePosition();
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setQuery("");
  };

  const select = (opt) => {
    onChange({ target: { name, value: opt } });
    close();
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    const reposition = () => updatePosition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e) => {
      if (
        !inputRef.current?.contains(e.target) &&
        !listRef.current?.contains(e.target)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isOpen]);

  // Keep the highlighted option in view while arrowing through the list
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
        e.preventDefault();
        open();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex] !== undefined) select(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") {
      close();
    }
  };

  return (
    <div className="relative flex items-center w-full min-w-0">
      <input
        ref={inputRef}
        type="text"
        name={name}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        value={isOpen ? query : (value ?? "")}
        placeholder={isOpen ? value || placeholder : placeholder}
        onFocus={open}
        onClick={open}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          if (!isOpen) {
            updatePosition();
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        className={`${className} pr-5`}
      />
      <ChevronDown
        size={14}
        className="absolute right-0 pointer-events-none text-gray-500"
      />

      {isOpen &&
        position &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            style={{
              position: "fixed",
              left: position.left,
              top: position.top,
              bottom: position.bottom,
              width: position.width,
            }}
            className="z-[130] max-h-[220px] overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg py-1 text-sm"
          >
            {filtered.length === 0 ? (
              <li className="px-2 py-1.5 text-gray-400">No matches</li>
            ) : (
              filtered.map((opt, index) => (
                <li
                  key={`${opt}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={opt === value}
                  onMouseDown={(e) => {
                    e.preventDefault(); // keep focus in the input
                    select(opt);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`px-2 py-1.5 cursor-pointer truncate ${
                    index === activeIndex
                      ? "bg-indigo-600 text-white"
                      : opt === value
                        ? "bg-indigo-50 text-gray-800"
                        : "text-gray-800"
                  } ${opt === "" ? "italic opacity-70" : ""}`}
                >
                  {opt === "" ? placeholder || "None" : opt}
                </li>
              ))
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
};

export default SearchableSelect;
