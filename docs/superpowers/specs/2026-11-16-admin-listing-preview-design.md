# Admin Listing Preview Design

## Problem

The legacy administrator item-management page lets staff open an item’s detailed listing view, inspect it in a modal, and close the view. The React admin workspace currently exposes moderation actions but has no equivalent listing preview.

## Goals

- Add a clearly labeled `View listing` action to every admin item record.
- Open the selected listing in an accessible modal dialog.
- Show only marketplace-facing listing information: photos, title, category, price, condition, status, description, and meet-up place.
- Close the preview through the close button, Escape, or backdrop dismissal.
- Keep pin, verify, and remove controls outside the preview.
- Preserve the existing admin authorization boundary and avoid introducing a client-controlled listing URL or iframe.

## Non-goals

- No new listing query or mutation endpoint.
- No marketplace actions such as messaging, purchasing, or reporting.
- No changes to listing data, database policies, or the legacy reference clone.
- No redesign of the broader admin item-management page.

## Design

`ItemManagement` owns a nullable `selectedListing` state. Each `ItemRecord` receives an `onView` callback and calls it from a `View listing` button. The item record continues to pass pin, verify, and remove callbacks independently.

`AdminListingPreview` is a dedicated presentational boundary around the existing Radix dialog primitives. It receives the `AdminListing` selected by the authorized admin workspace loader and renders the listing details directly. The component does not construct an iframe URL, navigate to another route, use `dangerouslySetInnerHTML`, or perform a client-controlled listing lookup.

The preview follows the existing listing media resolution pattern: absolute image URLs are used directly and storage paths are resolved through the existing Supabase storage client. React renders listing text as text nodes and image URLs through normal attributes. The preview has no moderation or buyer action controls.

When the dialog closes, `onOpenChange(false)` clears `selectedListing`, so the selected listing is not retained after dismissal. Radix supplies focus management, Escape handling, and backdrop behavior.

## Testing

Tests will be written before production code. The admin dashboard behavior suite will verify that:

1. `View listing` opens a dialog containing the selected listing’s details without invoking an admin mutation.
2. The dialog close control closes the preview and removes the listing content.
3. Status and price semantics are preserved, including hidden prices without exposing numeric values.
4. Existing pin, verify, and remove confirmation flows remain intact.

The focused tests will run first. Completion requires the relevant full frontend test suite, lint, and build to pass.

## Acceptance criteria

- An admin can click `View listing` from an item-management record.
- The preview opens in a modal and shows the selected listing’s marketplace-facing details.
- The preview can be closed with its close control, Escape, or the backdrop.
- Admin actions remain available outside the modal and continue to behave as before.
- The implementation contains no iframe or unsafe HTML rendering for the preview.
