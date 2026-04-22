/** E-18 target format safe encoding. */

export function encodeForJson(value: string): string {
  return JSON.stringify(value);
}

export function encodeForYaml(value: string): string {
  if (!value.includes("\n")) {
    return JSON.stringify(value);
  }
  const lines = value.split("\n");
  const chomping = value.endsWith("\n") ? "" : "-";
  return "|" + chomping + "\n" + lines.join("\n");
}

export function encodeForToml(value: string): string {
  if (value.includes("\n")) {
    const escaped = value.replace(/\\/g, "\\\\").replace(/"""/g, '""\\"');
    return '"""' + escaped + '"""';
  }
  return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}
