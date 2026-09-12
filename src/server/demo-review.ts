export function requestsMajorExpansion(content: string) {
  return /(?:增加|新增|扩展|加入|做成|改成).{0,12}(?:关卡|章节|难度系统|等级系统|成长系统|教学系统)|(?:多关卡|多章节|难度递进|等级成长)/u.test(content);
}
