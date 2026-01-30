/**
 * ISO 8601形式の日時文字列をJST形式にフォーマットする
 * @param isoString ISO 8601形式の日時文字列
 * @returns YYYY/MM/DD hh:mm:ss JST 形式の文字列
 */
export const formatDateJST = (isoString: string): string => {
  const date = new Date(isoString);
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${formatter.format(date)} JST`;
};
