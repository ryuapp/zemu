const std = @import("std");
const context = @import("../runtime/context.zig");

/// Execute a JavaScript file with command-line arguments
pub fn execute(allocator: std.mem.Allocator, filename: []const u8, args: []const [:0]const u8) !void {
    // Read the file
    const file = std.fs.cwd().openFile(filename, .{}) catch {
        var stderr_writer = std.fs.File.stderr().writer(&.{});
        const stderr = &stderr_writer.interface;
        stderr.print("error: file not found: {s}\n", .{filename}) catch {};
        std.process.exit(1);
    };
    defer file.close();

    const code = file.readToEndAlloc(allocator, 10 * 1024 * 1024) catch {
        var stderr_writer = std.fs.File.stderr().writer(&.{});
        const stderr = &stderr_writer.interface;
        stderr.print("error: cannot read file: {s}\n", .{filename}) catch {};
        std.process.exit(1);
    };
    defer allocator.free(code);

    // Create context and execute
    var ctx = try context.ZemuContext.init(allocator, 256 * 1024, args);
    defer ctx.deinit();

    _ = try ctx.eval(code, filename);
    ctx.flushLogs();
}
