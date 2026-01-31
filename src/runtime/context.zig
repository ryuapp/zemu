const std = @import("std");
const mquickjs = @import("mquickjs");
const errors = @import("errors.zig");

// Get our custom stdlib from src/stdlib.c
const stdlib = @extern(*const mquickjs.c.JSSTDLibraryDef, .{ .name = "js_stdlib" });

/// Wrapper around mquickjs.Context with error handling
pub const ZemuContext = struct {
    buffer: []align(8) u8,
    ctx: *mquickjs.Context,
    allocator: std.mem.Allocator,

    /// Initialize a new Zemu context with the given buffer size and command-line arguments
    pub fn init(allocator: std.mem.Allocator, buffer_size: usize, args: []const [:0]const u8) !ZemuContext {
        // Allocate aligned buffer for QuickJS (8-byte alignment)
        const buffer = try allocator.alignedAlloc(u8, @enumFromInt(8), buffer_size);
        errdefer allocator.free(buffer);

        // Create QuickJS context with the test stdlib from mquickjs
        const ctx = try mquickjs.Context.new(buffer, stdlib);
        errdefer ctx.free();

        // Build JSON array from args with proper string escaping
        // First, calculate the required size
        var json_size: usize = 2; // for "[]"
        for (args, 0..) |arg, i| {
            if (i > 0) json_size += 1; // comma
            json_size += 2; // quotes
            for (arg) |c| {
                if (c == '"' or c == '\\') json_size += 1; // escape char
                json_size += 1; // the char itself
            }
        }

        const args_json_buf = try allocator.alloc(u8, json_size);
        defer allocator.free(args_json_buf);
        var pos: usize = 0;
        args_json_buf[pos] = '[';
        pos += 1;
        for (args, 0..) |arg, i| {
            if (i > 0) {
                args_json_buf[pos] = ',';
                pos += 1;
            }
            args_json_buf[pos] = '"';
            pos += 1;
            for (arg) |c| {
                if (c == '"' or c == '\\') {
                    args_json_buf[pos] = '\\';
                    pos += 1;
                }
                args_json_buf[pos] = c;
                pos += 1;
            }
            args_json_buf[pos] = '"';
            pos += 1;
        }
        args_json_buf[pos] = ']';
        pos += 1;

        // Inject simple console.log polyfill (stdout/stderr separated) with args
        const polyfill = try std.fmt.allocPrint(allocator,
            \\globalThis.Zemu = {{
            \\  __stdout: [],
            \\  __stderr: [],
            \\  args: {s}
            \\}};
            \\var console = {{
            \\  log: function() {{
            \\    var msg = Array.prototype.slice.call(arguments).join(' ');
            \\    globalThis.Zemu.__stdout.push(msg);
            \\  }},
            \\  error: function() {{
            \\    var msg = Array.prototype.slice.call(arguments).join(' ');
            \\    globalThis.Zemu.__stderr.push(msg);
            \\  }},
            \\  warn: function() {{
            \\    var msg = Array.prototype.slice.call(arguments).join(' ');
            \\    globalThis.Zemu.__stderr.push(msg);
            \\  }},
            \\  info: function() {{
            \\    var msg = Array.prototype.slice.call(arguments).join(' ');
            \\    globalThis.Zemu.__stdout.push(msg);
            \\  }}
            \\}};
        , .{args_json_buf[0..pos]});
        defer allocator.free(polyfill);

        const polyfill_z = try allocator.dupeZ(u8, polyfill);
        defer allocator.free(polyfill_z);

        const result = mquickjs.Value.eval(ctx, polyfill_z, "<init>", .{});
        if (result.isException()) {
            std.debug.print("Failed to initialize console polyfill\n", .{});
        }

        return ZemuContext{
            .buffer = buffer,
            .ctx = ctx,
            .allocator = allocator,
        };
    }

    /// Flush any pending console messages to stdout/stderr
    pub fn flushLogs(self: *ZemuContext) void {
        const stdout_file = std.fs.File.stdout();
        const stderr_file = std.fs.File.stderr();

        // Flush stdout (console.log, console.info)
        const stdout_code = "globalThis.Zemu.__stdout.splice(0).join('\\n')";
        const stdout_z = self.allocator.dupeZ(u8, stdout_code) catch return;
        defer self.allocator.free(stdout_z);

        const stdout_result = mquickjs.Value.eval(self.ctx, stdout_z, "<flush-stdout>", .{ .retval = true });
        if (!stdout_result.isException() and !stdout_result.isUndefined()) {
            var buf: mquickjs.Value.StringBuf = undefined;
            var len: usize = 0;
            if (stdout_result.toCStringLen(self.ctx, &len, &buf)) |str| {
                if (len > 0) {
                    // Print to stdout
                    stdout_file.writeAll(std.mem.span(str)) catch {};
                    stdout_file.writeAll("\n") catch {};
                }
            }
        }

        // Flush stderr (console.error, console.warn)
        const stderr_code = "globalThis.Zemu.__stderr.splice(0).join('\\n')";
        const stderr_z = self.allocator.dupeZ(u8, stderr_code) catch return;
        defer self.allocator.free(stderr_z);

        const stderr_result = mquickjs.Value.eval(self.ctx, stderr_z, "<flush-stderr>", .{ .retval = true });
        if (!stderr_result.isException() and !stderr_result.isUndefined()) {
            var buf2: mquickjs.Value.StringBuf = undefined;
            var len2: usize = 0;
            if (stderr_result.toCStringLen(self.ctx, &len2, &buf2)) |str| {
                if (len2 > 0) {
                    // Print to stderr
                    stderr_file.writeAll(std.mem.span(str)) catch {};
                    stderr_file.writeAll("\n") catch {};
                }
            }
        }
    }

    /// Free the context and buffer
    pub fn deinit(self: *ZemuContext) void {
        self.ctx.free();
        self.allocator.free(self.buffer);
    }

    /// Evaluate JavaScript code and return the result
    pub fn eval(self: *ZemuContext, code: []const u8, filename: []const u8) !mquickjs.Value {
        // Add null terminator for mquickjs
        const code_z = try self.allocator.dupeZ(u8, code);
        defer self.allocator.free(code_z);
        const filename_z = try self.allocator.dupeZ(u8, filename);
        defer self.allocator.free(filename_z);

        const result = mquickjs.Value.eval(
            self.ctx,
            code_z,
            filename_z,
            .{ .retval = true },
        );

        // Check if an exception occurred
        if (result.isException()) {
            std.debug.print("JavaScript exception occurred\n", .{});
            return errors.ZemuError.EvalFailed;
        }

        return result;
    }

    /// Evaluate JavaScript code without printing exceptions
    pub fn evalNoThrow(self: *ZemuContext, code: []const u8, filename: []const u8) !mquickjs.Value {
        const code_z = try self.allocator.dupeZ(u8, code);
        defer self.allocator.free(code_z);
        const filename_z = try self.allocator.dupeZ(u8, filename);
        defer self.allocator.free(filename_z);

        return mquickjs.Value.eval(
            self.ctx,
            code_z,
            filename_z,
            .{},
        );
    }

    /// Get the underlying context
    pub fn getContext(self: *ZemuContext) *mquickjs.Context {
        return self.ctx;
    }
};
