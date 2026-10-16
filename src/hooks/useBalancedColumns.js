import { useEffect, useState } from "react";

// Max fields per row at each screen width (matches Tailwind sm / md / 2xl)
const getMaxColumns = (width) => {
  if (width >= 1536) return 10;
  if (width >= 768) return 8;
  if (width >= 640) return 2;
  return 1;
};

// Spreads `count` fields evenly over the fewest rows the screen allows,
// so the last row is as full as possible instead of holding a few leftovers.
const useBalancedColumns = (count) => {
  const [maxColumns, setMaxColumns] = useState(() =>
    getMaxColumns(window.innerWidth),
  );

  useEffect(() => {
    const onResize = () => setMaxColumns(getMaxColumns(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!count) return maxColumns;
  const rows = Math.ceil(count / maxColumns);
  return Math.ceil(count / rows);
};

export default useBalancedColumns;
