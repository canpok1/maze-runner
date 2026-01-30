/**
 * ISO 8601形式の日付文字列をJST表記にフォーマットする
 * @param isoString - ISO 8601形式の日付文字列（例: '2025-12-28T10:30:00Z'）
 * @returns 'YYYY/MM/DD hh:mm:ss JST' 形式の文字列
 */
export function formatDateJST(isoString: string): string {
  const date = new Date(isoString);
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jst.getUTCDate()).padStart(2, '0');
  const hours = String(jst.getUTCHours()).padStart(2, '0');
  const minutes = String(jst.getUTCMinutes()).padStart(2, '0');
  const seconds = String(jst.getUTCSeconds()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds} JST`;
}
