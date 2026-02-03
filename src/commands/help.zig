const std = @import("std");

pub fn execute() void {
    var stdout_writer = std.fs.File.stdout().writer(&.{});
    const stdout = &stdout_writer.interface;
    stdout.print(
        \\Usage: zemu [options] <file>
        \\
        \\Options:
        \\  -h, --help       Print this help message
        \\  -v, --version    Print this version
        \\  -e, --eval CODE  Evaluate inline JavaScript code
        \\
        \\Examples:
        \\  zemu hello.js                   Run a JavaScript file
        \\  zemu -e "console.log(48 + 19)"  Evaluate inline code
        \\
        \\GitHub: https://github.com/ryuapp/zemu
        \\
    , .{}) catch {};
}
