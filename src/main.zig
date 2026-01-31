const std = @import("std");
const cli = @import("cli.zig");
const run_cmd = @import("commands/run.zig");
const eval_cmd = @import("commands/eval.zig");
const help_cmd = @import("commands/help.zig");
const version = @import("version.zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var args = try cli.parse(allocator);
    defer args.deinit();

    // Extract user arguments (args after script name or eval code)
    const user_args = args.getUserArgs();

    if (args.help) {
        help_cmd.execute();
    } else if (args.version) {
        std.debug.print("{s}\n", .{version.VERSION});
    } else if (args.eval) |code| {
        eval_cmd.execute(allocator, code, user_args) catch {
            std.process.exit(1);
        };
    } else if (args.file) |filename| {
        run_cmd.execute(allocator, filename, user_args) catch {
            std.process.exit(1);
        };
    }
}
