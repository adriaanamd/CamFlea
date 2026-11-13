import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { browseCategories, browseConditions } from "@/features/browse/domain";

const categoryLabel = (value: string) =>
  value === "all" ? "All items" : value.replace(/\b\w/g, (letter) => letter.toUpperCase());

export function FilterRail({
  category,
  condition,
  sort,
  onCategoryChange,
  onConditionChange,
  onSortChange,
  onReset,
}: {
  category: string;
  condition: string;
  sort: "newest" | "price-low" | "price-high";
  onCategoryChange: (value: string) => void;
  onConditionChange: (value: string) => void;
  onSortChange: (value: "newest" | "price-low" | "price-high") => void;
  onReset: () => void;
}) {
  return (
    <section aria-label="Listing filters" className="filter-rail">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" aria-label="Categories">
        {["all", ...browseCategories].map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={category === value ? "default" : "outline"}
            aria-pressed={category === value}
            onClick={() => onCategoryChange(value)}
            className="shrink-0 rounded-full"
          >
            {categoryLabel(value)}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="browse-condition">Condition</Label>
          <select
            id="browse-condition"
            value={condition}
            onChange={(event) => onConditionChange(event.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">All conditions</option>
            {browseConditions.map((value) => (
              <option key={value} value={value}>
                {categoryLabel(value)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="browse-sort">Sort by</Label>
          <select
            id="browse-sort"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as typeof sort)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </div>
        <Button type="button" variant="ghost" onClick={onReset}>
          Reset filters
        </Button>
      </div>
    </section>
  );
}
