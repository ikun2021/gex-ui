export function timestampToDate(timestampSeconds) {
    let timestampMilliseconds = timestampSeconds * 1000;
    let date = new Date(timestampMilliseconds);
    let year = date.getFullYear();
    let month = String(date.getMonth() + 1).padStart(2, '0'); // 补齐月份的零
    let day = String(date.getDate()).padStart(2, '0'); // 补齐日期的零
    return `${year}-${month}-${day}`;
}
export function timestampToDateTime(seconds) {
    // 将秒转换为毫秒
    let timestamp = seconds * 1000;
    // 创建一个 Date 对象，将时间戳作为参数传递给构造函数
    let date = new Date(timestamp);
    // 获取年、月、日、时、分、秒等信息
    let year = date.getFullYear().toString(); // 获取年份的后两位
    let month = (date.getMonth() + 1).toString().padStart(2, '0'); // 月份是从0开始计数的，需要加1
    let day = date.getDate().toString().padStart(2, '0'); // 补齐单个数字的日期
    let hour = date.getHours().toString().padStart(2, '0'); // 补齐单个数字的小时
    let minute = date.getMinutes().toString().padStart(2, '0'); // 补齐单个数字的分钟
    let second = date.getSeconds().toString().padStart(2, '0'); // 补齐单个数字的秒钟
    // 格式化输出时间
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}
export function timestampToTime(seconds) {
    // 将秒转换为毫秒
    let timestamp = seconds * 1000;
    // 创建一个 Date 对象，将时间戳作为参数传递给构造函数
    let date = new Date(timestamp);
    // 获取年、月、日、时、分、秒等信息
    let hour = date.getHours().toString().padStart(2, '0'); // 补齐单个数字的小时
    let minute = date.getMinutes().toString().padStart(2, '0'); // 补齐单个数字的分钟
    let second = date.getSeconds().toString().padStart(2, '0'); // 补齐单个数字的秒钟
    // 格式化输出时间
    return `${hour}:${minute}:${second}`;
}
