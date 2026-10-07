export function ticketIdFromEvent(event) {
  return event.ticket?.id ?? event.channelId;
}

export function isStatusInReview(event) {
  return event.type === "status_changed" && event.toValue === "in_review";
}

function labelNames(value) {
  if (!Array.isArray(value)) return [];
  return value.map((row) =>
    String(row?.name ?? row ?? "")
      .trim()
      .toLowerCase(),
  );
}

/** Optional: workspace label literally named "In review". */
export function isInReviewLabelAdded(event) {
  if (event.type !== "labels_changed") return false;
  const before = new Set(labelNames(event.fromValue));
  const after = labelNames(event.toValue);
  return after.some(
    (name) =>
      !before.has(name) &&
      (name === "in review" || name === "in_review" || name === "in-review"),
  );
}

export function assignedUserId(value) {
  if (!value || typeof value !== "object" || !("id" in value)) return null;
  const id = value.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function isAssignedToBot(event, botUserId) {
  return (
    event.type === "assignee_changed" &&
    assignedUserId(event.toValue) === botUserId
  );
}

export function shouldStartReviewFromEvent(event, botUserId) {
  if (isStatusInReview(event) || isInReviewLabelAdded(event)) return true;
  return isAssignedToBot(event, botUserId);
}
