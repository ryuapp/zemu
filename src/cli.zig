const std = @import("std");

pub const Args = struct {
    help: bool = false,
    version: bool = false,
    eval: ?[]const u8 = null,
    file: ?[]const u8 = null,

    allocator: std.mem.Allocator,
    raw_args: [][:0]u8,

    pub fn deinit(self: *Args) void {
        std.process.argsFree(self.allocator, self.raw_args);
    }

    /// Get user arguments (arguments after the script name or eval code)
    pub fn getUserArgs(self: *const Args) [][:0]u8 {
        if (self.eval != null) {
            // For eval mode: skip "zemu", "-e", "code"
            if (self.raw_args.len > 3) return self.raw_args[3..];
        } else if (self.file != null) {
            // For file mode: skip "zemu", "script.js"
            if (self.raw_args.len > 2) return self.raw_args[2..];
        }
        return &[_][:0]u8{};
    }
};

/// Parse command-line arguments
pub fn parse(allocator: std.mem.Allocator) !Args {
    const raw_args = try std.process.argsAlloc(allocator);
    errdefer std.process.argsFree(allocator, raw_args);

    var result = Args{
        .allocator = allocator,
        .raw_args = raw_args,
    };

    // If no arguments, show help
    if (raw_args.len == 1) {
        result.help = true;
        return result;
    }

    const first_arg = raw_args[1];

    // Check for flags
    if (std.mem.eql(u8, first_arg, "-h") or std.mem.eql(u8, first_arg, "--help")) {
        result.help = true;
    } else if (std.mem.eql(u8, first_arg, "-v") or std.mem.eql(u8, first_arg, "--version")) {
        result.version = true;
    } else if (std.mem.eql(u8, first_arg, "-e") or std.mem.eql(u8, first_arg, "--eval")) {
        if (raw_args.len < 3) {
            std.debug.print("Error: -e requires an argument\n", .{});
            std.process.exit(1);
        }
        result.eval = raw_args[2];
    } else {
        result.file = first_arg;
    }

    return result;
}
