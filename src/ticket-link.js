export function ticketPageUrl(ticket, origin = process.env.JEICHAT_WEB_ORIGIN) {
  const base = String(origin ?? "http://localhost:3000").replace(/\/$/, "");
  const workspaceId = ticket?.workspaceId;
  const id = ticket?.id;
  if (!base || !workspaceId || !id) return null;
  return `${base}/w/${workspaceId}/c/${id}`;
}

export function formatTicketDisplayId(ticket) {
  const prefix = String(ticket?.ticketPrefix ?? "")
    .trim()
    .toUpperCase();
  const number = Number(ticket?.ticketNumber);
  if (prefix && Number.isInteger(number) && number > 0) {
    return `${prefix}-${number}`;
  }
  if (Number.isInteger(number) && number > 0) return `#${number}`;
  const id = String(ticket?.id ?? "");
  return id ? id.slice(0, 8) : "ticket";
}
