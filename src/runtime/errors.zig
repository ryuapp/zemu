const std = @import("std");
const mquickjs = @import("mquickjs");

pub const ZemuError = error{
    EvalFailed,
    FileNotFound,
    FileReadError,
    OutOfMemory,
};

/// Format and print a JavaScript exception to stderr
pub fn printException(ctx: *mquickjs.Context, allocator: std.mem.Allocator) void {
    const exception = ctx.getException();
    defer exception.free();

    const error_msg = exception.toString(allocator) catch {
        std.debug.print("Failed to get exception message\n", .{});
        return;
    };
    defer allocator.free(error_msg);

    std.debug.print("Error: {s}\n", .{error_msg});

    // Try to get stack trace if available
    if (exception.getProperty(allocator, "stack")) |stack_prop| {
        defer stack_prop.free();
        if (stack_prop.toString(allocator)) |stack_str| {
            defer allocator.free(stack_str);
            std.debug.print("{s}\n", .{stack_str});
        } else |_| {
            // No stack trace available
        }
    } else |_| {
        // No stack property
    }
}

/// Get exception message as a string
pub fn getExceptionMessage(ctx: *mquickjs.Context, allocator: std.mem.Allocator) ![]const u8 {
    const exception = ctx.getException();
    defer exception.free();

    return exception.toString(allocator);
}
