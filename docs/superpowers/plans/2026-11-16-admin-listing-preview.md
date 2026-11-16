# Admin Listing Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Add a secure, accessible `View listing` modal to the React admin item-management tab.

**Architecture:** Keep selection state in `ItemManagement`, pass a callback through `ItemRecord`, and render the selected authorized `AdminListing` in a dedicated `AdminListingPreview` component. Use the existing Radix dialog primitives and existing listing price/media patterns; do not navigate, embed an iframe, or perform a client-controlled listing lookup.

**Tech Stack:** TanStack Start, React 19, TypeScript, Radix UI Dialog, Supabase storage client, Tailwind utility classes, Vitest, Testing Library, ESLint, Vite.

## Global Constraints

- Keep the marketplace in the existing TanStack Start React app.
- Authorize staff actions from Supabase rather than browser state.
- Treat `camflea-legacy/camflea-new-main/` as read-only reference material.
- Run frontend checks from `camflea-frontend/`.
- Write tests before production code and verify each red → green cycle.
- Do not add an iframe, `dangerouslySetInnerHTML`, a new listing query, or a buyer/moderation action inside the preview.
- Preserve existing pin, verify, remove, filtering, and admin authorization behavior.

## File Map

- Modify `camflea-test/integration/server/admin-dashboard.test.tsx` for admin preview interaction tests and shared fixtures.
- Create `camflea-frontend/src/features/admin/admin-listing-preview.tsx` for the controlled dialog, listing-facing details, and secure photo resolution.
- Modify `camflea-frontend/src/features/admin/admin-dashboard.tsx` to own selection state, expose `View listing`, and render the preview.
- Modify `camflea-frontend/src/styles.css` for the preview gallery and responsive modal layout.
- Modify this plan only if execution reveals a concrete design correction; do not add unrelated refactors.

## Task 1: Establish focused admin listing fixtures

**Files:**
- Modify: `camflea-test/integration/server/admin-dashboard.test.tsx`

**Interfaces:**
- Produce a typed `hiddenPriceListing` fixture and a `renderItemsDashboard` helper for later tests.

- [ ] **Step 1: Add the hidden-price fixture and render helper without changing assertions.**

```tsx
import type { ComponentProps } from "react";

const hiddenPriceListing: AdminListing = {
  ...listing,
  id: "44444444-4444-4444-8444-444444444444",
  title: "Campus jacket",
  price_type: "hidden",
  price: null,
  price_min: null,
  price_max: null,
};

function renderItemsDashboard(
  overrides: Partial<AdminWorkspaceData> = {},
  props: Partial<ComponentProps<typeof AdminDashboard>> = {},
) {
  return render(
    <AdminDashboard
      tab="items"
      loadWorkspace={vi.fn().mockResolvedValue({ ...workspace, ...overrides })}
      {...props}
    />,
  );
}
```

- [ ] **Step 2: Run the existing admin dashboard suite.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx`
Expected: existing tests pass.

- [ ] **Step 3: Commit the fixture-only test refactor.**

```bash
git add camflea-test/integration/server/admin-dashboard.test.tsx
git commit -m "test: prepare admin listing preview fixtures"
```

## Task 2: Add the failing open-preview behavior and selected-listing state

**Files:**
- Modify: `camflea-test/integration/server/admin-dashboard.test.tsx`
- Modify: `camflea-frontend/src/features/admin/admin-dashboard.tsx`

**Interfaces:**
- `ItemManagement` gains `selectedListing: AdminListing | null` state.
- `ItemRecord` accepts `onView: (listing: AdminListing) => void`.

- [ ] **Step 1: Write the failing interaction test.**

```tsx
it("opens the selected listing preview without running an admin mutation", async () => {
  const setListingFlags = vi.fn().mockResolvedValue({ success: true });
  const deleteListing = vi.fn().mockResolvedValue({ success: true });

  renderItemsDashboard(
    { listings: [listing] },
    { setListingFlags, deleteListing },
  );

  fireEvent.click(await screen.findByRole("button", { name: "View listing" }));

  expect(await screen.findByRole("dialog")).toBeVisible();
  expect(screen.getByRole("heading", { name: listing.title })).toBeVisible();
  expect(setListingFlags).not.toHaveBeenCalled();
  expect(deleteListing).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because the view action is missing.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "opens the selected listing preview"`
Expected: FAIL because no `View listing` button exists yet.

- [ ] **Step 3: Add the smallest state and callback wiring.**

```tsx
const [selectedListing, setSelectedListing] = useState<AdminListing | null>(null);

<ItemManagement
  listings={workspace.listings}
  onAction={runAction}
  setListingFlags={setListingFlags}
  deleteListing={deleteListing}
  onView={setSelectedListing}
/>
```

Add `onView` to `ItemManagement` and `ItemRecord` props, then add this button beside the existing actions:

```tsx
<Button type="button" variant="outline" onClick={() => onView(listing)}>
  View listing
</Button>
```

- [ ] **Step 4: Run the test and confirm the expected next failure is the missing dialog.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "opens the selected listing preview"`
Expected: FAIL because the button exists but no dialog is rendered.

- [ ] **Step 5: Commit the selection-state and action wiring.**

```bash
git add camflea-test/integration/server/admin-dashboard.test.tsx camflea-frontend/src/features/admin/admin-dashboard.tsx
git commit -m "feat: add admin listing view action"
```

## Task 3: Add the accessible dialog shell

**Files:**
- Create: `camflea-frontend/src/features/admin/admin-listing-preview.tsx`
- Modify: `camflea-frontend/src/features/admin/admin-dashboard.tsx`

**Interfaces:**
- `AdminListingPreview({ listing, onClose })` accepts `listing: AdminListing | null` and `onClose: () => void`.

- [ ] **Step 1: Create the minimal controlled dialog.**

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AdminListing } from "@/features/admin/admin-dashboard-data";

export function AdminListingPreview({
  listing,
  onClose,
}: {
  listing: AdminListing | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={listing !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="admin-listing-preview max-w-4xl">
        {listing ? (
          <DialogHeader>
            <DialogTitle>{listing.title}</DialogTitle>
            <DialogDescription>Listing preview</DialogDescription>
          </DialogHeader>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Render the preview from `ItemManagement`.**

```tsx
<AdminListingPreview
  listing={selectedListing}
  onClose={() => setSelectedListing(null)}
/>
```

- [ ] **Step 3: Run the focused open test.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "opens the selected listing preview"`
Expected: PASS with a visible accessible dialog.

- [ ] **Step 4: Commit the dialog shell.**

```bash
git add camflea-frontend/src/features/admin/admin-listing-preview.tsx camflea-frontend/src/features/admin/admin-dashboard.tsx
git commit -m "feat: add admin listing preview dialog"
```

## Task 4: Render marketplace-facing text details

**Files:**
- Modify: `camflea-test/integration/server/admin-dashboard.test.tsx`
- Modify: `camflea-frontend/src/features/admin/admin-listing-preview.tsx`

- [ ] **Step 1: Extend the test with the approved detail fields.**

```tsx
expect(screen.getByText(listing.description)).toBeVisible();
expect(screen.getByText(listing.category)).toBeVisible();
expect(screen.getByText(listing.condition)).toBeVisible();
expect(screen.getByText(/Meet-up place:/i)).toHaveTextContent(listing.meeting_place);
```

- [ ] **Step 2: Run the focused test and confirm it fails for the missing detail fields.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "opens the selected listing preview"`
Expected: FAIL on the first missing field.

- [ ] **Step 3: Render only listing information inside the dialog.**

```tsx
<div className="admin-listing-preview-details">
  <p>{listing.category}</p>
  <p>{listing.condition}</p>
  <div>
    <h3>Description</h3>
    <p>{listing.description}</p>
  </div>
  <p>
    <strong>Meet-up place:</strong> {listing.meeting_place}
  </p>
</div>
```

- [ ] **Step 4: Run the focused test to verify green.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "opens the selected listing preview"`
Expected: PASS.

- [ ] **Step 5: Commit the listing details.**

```bash
git add camflea-test/integration/server/admin-dashboard.test.tsx camflea-frontend/src/features/admin/admin-listing-preview.tsx
git commit -m "feat: show admin listing details in preview"
```

## Task 5: Add price semantics, including hidden prices

**Files:**
- Modify: `camflea-test/integration/server/admin-dashboard.test.tsx`
- Modify: `camflea-frontend/src/features/admin/admin-listing-preview.tsx`

- [ ] **Step 1: Add a hidden-price test.**

```tsx
it("keeps hidden listing prices hidden in the preview", async () => {
  renderItemsDashboard({ listings: [hiddenPriceListing] });

  fireEvent.click(await screen.findByRole("button", { name: "View listing" }));

  const dialog = await screen.findByRole("dialog");
  expect(dialog).toHaveTextContent("Price hidden");
  expect(dialog).not.toHaveTextContent("44444444");
});
```

- [ ] **Step 2: Run the test and confirm it fails because no price is rendered.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "keeps hidden listing prices hidden"`
Expected: FAIL because `Price hidden` is not present.

- [ ] **Step 3: Use the shared price formatter.**

```tsx
import { formatListingPrice } from "@/features/browse/domain";

<p className="admin-listing-preview-price">{formatListingPrice(listing)}</p>
```

- [ ] **Step 4: Run the price tests.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "listing preview|hidden listing prices"`
Expected: PASS.

- [ ] **Step 5: Commit price semantics.**

```bash
git add camflea-test/integration/server/admin-dashboard.test.tsx camflea-frontend/src/features/admin/admin-listing-preview.tsx
git commit -m "feat: preserve listing price semantics in preview"
```

## Task 6: Add status and listing metadata semantics

**Files:**
- Modify: `camflea-test/integration/server/admin-dashboard.test.tsx`
- Modify: `camflea-frontend/src/features/admin/admin-listing-preview.tsx`

- [ ] **Step 1: Add status assertions.**

```tsx
expect(screen.getByText(/available/i)).toBeVisible();
expect(screen.getByText(/Status/i)).toHaveTextContent("available");
```

- [ ] **Step 2: Run the focused test and confirm the missing status failure.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "opens the selected listing preview"`
Expected: FAIL because the preview has no status field.

- [ ] **Step 3: Render status as text and a semantic status pill without marketplace actions.**

```tsx
import { StatusPill } from "@/components/status-pill";

<p>
  <strong>Status:</strong> <StatusPill status={listing.status} label={listing.status} />
</p>
```

- [ ] **Step 4: Verify the listing preview still contains no buyer or moderation controls.**

```tsx
expect(screen.queryByRole("button", { name: "Purchase" })).not.toBeInTheDocument();
expect(screen.queryByRole("button", { name: "Message seller" })).not.toBeInTheDocument();
expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
```

- [ ] **Step 5: Run and commit.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "listing preview"`
Expected: PASS.

```bash
git add camflea-test/integration/server/admin-dashboard.test.tsx camflea-frontend/src/features/admin/admin-listing-preview.tsx
git commit -m "feat: show listing status in admin preview"
```

## Task 7: Add the external-photo gallery

**Files:**
- Modify: `camflea-test/integration/server/admin-dashboard.test.tsx`
- Modify: `camflea-frontend/src/features/admin/admin-listing-preview.tsx`

- [ ] **Step 1: Add a multi-photo preview test.**

```tsx
it("shows listing photos in the preview gallery", async () => {
  const photoListing = { ...listing, photos: [
    "https://cdn.example.test/book-front.png",
    "https://cdn.example.test/book-back.png",
  ] } as AdminListing;
  renderItemsDashboard({ listings: [photoListing] });

  fireEvent.click(await screen.findByRole("button", { name: "View listing" }));

  expect(await screen.findByRole("img", { name: "Calculus book photo 1" })).toHaveAttribute(
    "src",
    "https://cdn.example.test/book-front.png",
  );
  expect(screen.getByRole("button", { name: "Show photo 2" })).toBeVisible();
});
```

- [ ] **Step 2: Run the test and verify it fails because the preview has no gallery.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "shows listing photos"`
Expected: FAIL because no listing image is rendered.

- [ ] **Step 3: Add selected-photo state and direct external URL rendering.**

```tsx
const [selectedPhoto, setSelectedPhoto] = useState(0);
useEffect(() => setSelectedPhoto(0), [listing?.id]);
const selectedPhotoUrl = listing?.photos[selectedPhoto] ?? null;
```

Render the main image and thumbnail buttons with React attributes only:

```tsx
{selectedPhotoUrl ? (
  <img src={selectedPhotoUrl} alt={`${listing.title} photo ${selectedPhoto + 1}`} />
) : (
  <p>No photos available</p>
)}
{listing.photos.map((photo, index) => (
  <button
    key={photo}
    type="button"
    aria-label={`Show photo ${index + 1}`}
    aria-pressed={selectedPhoto === index}
    onClick={() => setSelectedPhoto(index)}
  >
    <img src={photo} alt="" />
  </button>
))}
```

- [ ] **Step 4: Run the gallery test.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "shows listing photos"`
Expected: PASS.

- [ ] **Step 5: Commit the gallery behavior.**

```bash
git add camflea-test/integration/server/admin-dashboard.test.tsx camflea-frontend/src/features/admin/admin-listing-preview.tsx
git commit -m "feat: add admin listing photo gallery"
```

## Task 8: Resolve private storage photo paths securely

**Files:**
- Modify: `camflea-test/integration/server/admin-dashboard.test.tsx`
- Modify: `camflea-frontend/src/features/admin/admin-listing-preview.tsx`

- [ ] **Step 1: Add a storage-path test with the Supabase client mocked at its module boundary.**

```tsx
const supabaseMocks = vi.hoisted(() => ({
  createSignedUrl: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: supabaseMocks.from } },
}));

it("resolves storage photo paths through signed URLs", async () => {
  const photoListing = { ...listing, photos: ["private/book-front.png"] } as AdminListing;
  supabaseMocks.from.mockReturnValue({ createSignedUrl: supabaseMocks.createSignedUrl });
  supabaseMocks.createSignedUrl.mockResolvedValue({
    data: { signedUrl: "https://signed.example.test/book-front.png" },
    error: null,
  });
  renderItemsDashboard({ listings: [photoListing] });

  fireEvent.click(await screen.findByRole("button", { name: "View listing" }));

  expect(await screen.findByRole("img", { name: "Calculus book photo 1" })).toHaveAttribute(
    "src",
    "https://signed.example.test/book-front.png",
  );
  expect(supabaseMocks.createSignedUrl).toHaveBeenCalledWith("private/book-front.png", 3600);
});
```

The test mocks only the Supabase client module boundary. It must not mock `AdminListingPreview` or bypass the storage call.

- [ ] **Step 2: Run the test and confirm the path is not used as a public URL.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "signed URLs"`
Expected: FAIL until storage paths are resolved.

- [ ] **Step 3: Implement the same guarded resolution pattern as `ListingDetail`.**

```tsx
const [photoUrls, setPhotoUrls] = useState<(string | null)[]>([]);

useEffect(() => {
  let active = true;
  if (!listing) {
    setPhotoUrls([]);
    return () => {
      active = false;
    };
  }
  void Promise.all(
    listing.photos.map(async (photo) => {
      if (/^https?:\/\//i.test(photo)) return photo;
      const { data } = await supabase.storage
        .from("camflea-listings")
        .createSignedUrl(photo, 3600);
      return data?.signedUrl ?? null;
    }),
  ).then((urls) => {
    if (active) setPhotoUrls(urls);
  });
  return () => {
    active = false;
  };
}, [listing]);
```

- [ ] **Step 4: Use only resolved URLs for the image elements and keep unresolved photos as placeholders.**

- [ ] **Step 5: Run the photo tests and commit.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "photo|signed URLs"`
Expected: PASS.

```bash
git add camflea-test/integration/server/admin-dashboard.test.tsx camflea-frontend/src/features/admin/admin-listing-preview.tsx
git commit -m "security: sign admin preview photo paths"
```

## Task 9: Add an explicit visible close control

**Files:**
- Modify: `camflea-test/integration/server/admin-dashboard.test.tsx`
- Modify: `camflea-frontend/src/features/admin/admin-listing-preview.tsx`

- [ ] **Step 1: Add the close behavior test.**

```tsx
it("closes the listing preview from its close control", async () => {
  renderItemsDashboard({ listings: [listing] });
  fireEvent.click(await screen.findByRole("button", { name: "View listing" }));

  const dialog = await screen.findByRole("dialog");
  expect(dialog).toHaveTextContent(listing.title);
  fireEvent.click(screen.getByRole("button", { name: "Close listing preview" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.queryByText(listing.title)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and confirm the visible close action is missing.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "closes the listing preview"`
Expected: FAIL because the explicit close button is missing.

- [ ] **Step 3: Add a `DialogClose` footer button.**

```tsx
import { DialogClose, DialogFooter } from "@/components/ui/dialog";

<DialogFooter>
  <DialogClose asChild>
    <Button type="button" variant="outline" aria-label="Close listing preview">
      Close
    </Button>
  </DialogClose>
</DialogFooter>
```

- [ ] **Step 4: Run the close test and commit.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "closes the listing preview"`
Expected: PASS.

```bash
git add camflea-test/integration/server/admin-dashboard.test.tsx camflea-frontend/src/features/admin/admin-listing-preview.tsx
git commit -m "feat: add admin listing preview close control"
```

## Task 10: Verify Escape and backdrop dismissal

**Files:**
- Modify: `camflea-test/integration/server/admin-dashboard.test.tsx`
- Modify: `camflea-frontend/src/features/admin/admin-listing-preview.tsx` only if the controlled close callback is not wired correctly.

- [ ] **Step 1: Add keyboard and backdrop tests.**

```tsx
it("closes the listing preview with Escape", async () => {
  renderItemsDashboard({ listings: [listing] });
  fireEvent.click(await screen.findByRole("button", { name: "View listing" }));
  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

it("closes the listing preview when the backdrop is dismissed", async () => {
  renderItemsDashboard({ listings: [listing] });
  fireEvent.click(await screen.findByRole("button", { name: "View listing" }));
  const overlay = document.querySelector(".fixed.inset-0.z-50") as HTMLElement;
  fireEvent.pointerDown(overlay);
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
```

- [ ] **Step 2: Run both tests.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "Escape|backdrop"`
Expected: PASS through Radix controlled dialog behavior; the existing overlay classes uniquely identify the backdrop because the dialog content does not include `inset-0`.

- [ ] **Step 3: Commit the dismissal coverage.**

```bash
git add camflea-test/integration/server/admin-dashboard.test.tsx
git commit -m "test: cover admin listing preview dismissal"
```

## Task 11: Add an explicit security regression assertion

**Files:**
- Modify: `camflea-test/integration/server/admin-dashboard.test.tsx`
- Modify: `camflea-frontend/src/features/admin/admin-listing-preview.tsx` only if the assertion reveals unsafe rendering.

- [ ] **Step 1: Assert that preview rendering stays in the React dialog boundary.**

```tsx
it("does not embed a separate listing document in the preview", async () => {
  renderItemsDashboard({ listings: [listing] });
  fireEvent.click(await screen.findByRole("button", { name: "View listing" }));

  expect(screen.queryByTitle(/listing/i)).not.toBeInTheDocument();
  expect(document.querySelector("iframe")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the security regression test.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "separate listing document"`
Expected: PASS.

- [ ] **Step 3: Commit the security regression coverage.**

```bash
git add camflea-test/integration/server/admin-dashboard.test.tsx
git commit -m "test: lock admin preview to React rendering"
```

## Task 12: Add modal/gallery styling within the existing admin language

**Files:**
- Modify: `camflea-frontend/src/styles.css`

- [ ] **Step 1: Add focused classes after the existing admin record styles.**

```css
.admin-listing-preview {
  max-height: 90vh;
  overflow-y: auto;
}

.admin-listing-preview-layout {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
}

.admin-listing-preview-gallery {
  display: grid;
  gap: 0.75rem;
}

.admin-listing-preview-main-image,
.admin-listing-preview-placeholder {
  aspect-ratio: 1;
  width: 100%;
  border-radius: 1rem;
  object-fit: cover;
  background: hsl(var(--muted));
}

.admin-listing-preview-thumbnails {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.admin-listing-preview-thumbnail {
  height: 4rem;
  width: 4rem;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 0.75rem;
  opacity: 0.7;
}

.admin-listing-preview-thumbnail[aria-pressed="true"] {
  border-color: hsl(var(--primary));
  opacity: 1;
}
```

- [ ] **Step 2: Run the preview tests and lint.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "listing preview|photo"` and `npm run lint`
Expected: PASS with no lint errors.

- [ ] **Step 3: Commit the modal styling.**

```bash
git add camflea-frontend/src/styles.css
git commit -m "style: add admin listing preview layout"
```

## Task 13: Add responsive layout behavior and accessibility checks

**Files:**
- Modify: `camflea-test/integration/server/admin-dashboard.test.tsx`
- Modify: `camflea-frontend/src/styles.css`

- [ ] **Step 1: Add accessibility assertions.**

```tsx
expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
expect(screen.getByRole("dialog")).toHaveAccessibleName(listing.title);
expect(screen.getByRole("dialog")).toHaveAccessibleDescription("Listing preview");
```

- [ ] **Step 2: Add the mobile media query.**

```css
@media (max-width: 700px) {
  .admin-listing-preview-layout {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Run focused tests and lint.**

Run: `npm test -- --run ../camflea-test/integration/server/admin-dashboard.test.tsx -t "listing preview"` and `npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit responsive and accessibility polish.**

```bash
git add camflea-test/integration/server/admin-dashboard.test.tsx camflea-frontend/src/styles.css
git commit -m "fix: make admin listing preview accessible and responsive"
```

## Task 14: Refactor only after green and preserve existing admin behavior

**Files:**
- Modify: `camflea-frontend/src/features/admin/admin-listing-preview.tsx` only for duplication or naming cleanup discovered after green.
- Modify: `camflea-frontend/src/features/admin/admin-dashboard.tsx` only for callback/type cleanup discovered after green.
- Modify: `camflea-test/integration/server/admin-dashboard.test.tsx` only for stable test queries.

- [ ] **Step 1: Review the new component for unsafe or duplicated logic.**

Confirm that all listing text is rendered as JSX text, storage paths are signed, and the preview has no action callbacks other than close and photo selection.

- [ ] **Step 2: Run the full relevant frontend gates.**

Run from `camflea-frontend/`:

```bash
npm test
npm run lint
npm run build
```

Expected: all tests pass, lint exits 0, and the production build completes.

- [ ] **Step 3: Commit only if the green-only refactor changed files.**

```bash
git add camflea-frontend/src/features/admin/admin-listing-preview.tsx camflea-frontend/src/features/admin/admin-dashboard.tsx camflea-test/integration/server/admin-dashboard.test.tsx
git commit -m "refactor: finalize admin listing preview boundaries"
```

## Task 15: Final verification and history audit

**Files:**
- No code changes expected.

- [ ] **Step 1: Confirm the feature commits are present and scoped.**

Run: `git log --oneline --decorate -20`
Expected: the recent history contains the spec, plan, and focused admin preview commits, with no unrelated files.

- [ ] **Step 2: Confirm the worktree and staged state.**

Run: `git status --short --branch`
Expected: clean worktree on `main`; no unstaged or staged changes.

- [ ] **Step 3: Report exact verification output and remote CI status.**

Do not claim completion without fresh local test, lint, and build output. If GitHub Actions is not available in the current session, label remote CI as unverified.
