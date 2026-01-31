const std = @import("std");
const context = @import("../runtime/context.zig");

/// Execute a JavaScript file with command-line arguments
pub fn execute(allocator: std.mem.Allocator, filename: []const u8, args: []const [:0]const u8) !void {
    // Read the file
    const file = std.fs.cwd().openFile(filename, .{}) catch {
        std.debug.print("error: file not found: {s}\n", .{filename});
        std.process.exit(1);
    };
    defer file.close();

    const code = file.readToEndAlloc(allocator, 10 * 1024 * 1024) catch {
        std.debug.print("error: cannot read file: {s}\n", .{filename});
        std.process.exit(1);
    };
    defer allocator.free(code);

    // Create context and execute
    var ctx = try context.ZemuContext.init(allocator, 256 * 1024, args);
    defer ctx.deinit();

    _ = try ctx.eval(code, filename);
    // Flush any console.log output
    ctx.flushLogs();
}
