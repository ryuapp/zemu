const std = @import("std");
const context = @import("../runtime/context.zig");

/// Evaluate inline JavaScript code with command-line arguments
pub fn execute(allocator: std.mem.Allocator, code: []const u8, args: []const [:0]const u8) !void {
    var ctx = try context.ZemuContext.init(allocator, 256 * 1024, args);
    defer ctx.deinit();

    const result = try ctx.eval(code, "<eval>");

    // Flush any console.log output
    ctx.flushLogs();

    // Print the result if it's not undefined
    if (!result.isUndefined()) {
        var buf: @import("mquickjs").Value.StringBuf = undefined;
        var len: usize = 0;
        if (result.toCStringLen(ctx.getContext(), &len, &buf)) |str| {
            std.debug.print("{s}\n", .{std.mem.span(str)});
        }
    }
}
