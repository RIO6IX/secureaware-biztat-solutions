// Input validation for the training API. Every validator throws a 400 error with a
// user-safe message so route handlers never act on unchecked input.

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
    this.publicMessage = message;
  }
}

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  error.publicMessage = message;
  return error;
}

export function fail(message) {
  throw new ValidationError(message);
}

export function asObject(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) fail("Request body must be a JSON object");
  return body;
}

export function id(value, name = "id") {
  const text = typeof value === "number" ? String(value) : value;
  if (typeof text !== "string" || !/^[1-9]\d{0,8}$/.test(text)) fail(`${name} must be a positive integer`);
  return Number(text);
}

export function optionalId(value, name) {
  return value === undefined || value === null || value === "" ? null : id(value, name);
}

export function slug(value, name = "slug") {
  if (typeof value !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 80) fail(`${name} must be lower-case words separated by hyphens`);
  return value;
}

export function text(value, name, { min = 1, max = 200, required = true } = {}) {
  if (value === undefined || value === null) {
    if (required) fail(`${name} is required`);
    return "";
  }
  if (typeof value !== "string") fail(`${name} must be text`);
  const trimmed = value.trim();
  if (required && trimmed.length < min) fail(`${name} must be at least ${min} characters`);
  if (trimmed.length > max) fail(`${name} must be at most ${max} characters`);
  return trimmed;
}

export function int(value, name, min, max) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) fail(`${name} must be a whole number from ${min} to ${max}`);
  return value;
}

export function bool(value, name) {
  if (typeof value !== "boolean") fail(`${name} must be true or false`);
  return value;
}

export function oneOf(value, name, allowed) {
  if (!allowed.includes(value)) fail(`${name} must be one of: ${allowed.join(", ")}`);
  return value;
}

export function isoDate(value, name) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${name} must be a date in YYYY-MM-DD format`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail(`${name} is not a real date`);
  return value;
}

export function textList(value, name, { maxItems = 12, maxLength = 300 } = {}) {
  if (!Array.isArray(value) || value.length > maxItems) fail(`${name} must be a list of at most ${maxItems} items`);
  return value.map((item, index) => text(item, `${name} item ${index + 1}`, { max: maxLength }));
}

export function queryText(params, name, max = 80) {
  const value = params.get(name);
  if (value === null || value === "") return null;
  if (value.length > max) fail(`${name} is too long`);
  return value;
}
