function js_beautify(js_source_text, indent_size, indent_character, indent_level) {
    let input, output, token_text, last_type, last_text, last_word, current_mode, modes, indent_string;
    let whitespace, wordchar, punct, parser_pos, line_starters, in_case;
    let prefix, token_type, do_block_just_closed, var_line, var_line_tainted;

    function trim_output() {
        while (output.length && (output[output.length - 1] === " " || output[output.length - 1] === indent_string)) {
            output.pop()
        }
    }

    function print_newline(ignore_repeated) {
        ignore_repeated = typeof ignore_repeated === "undefined" ? true : ignore_repeated;
        trim_output();
        if (!output.length) {
            return
        }
        if (output[output.length - 1] !== "\n" || !ignore_repeated) {
            output.push("\n")
        }
        for (let i = 0; i < indent_level; i++) {
            output.push(indent_string)
        }
    }

    function print_space() {
        const last_output = output.length ? output[output.length - 1] : " ";
        if (last_output !== " " && last_output !== "\n" && last_output !== indent_string) {
            output.push(" ")
        }
    }

    function print_token() {
        output.push(token_text)
    }

    function indent() {
        indent_level++
    }

    function unindent() {
        if (indent_level) {
            indent_level--
        }
    }

    function remove_indent() {
        if (output.length && output[output.length - 1] === indent_string) {
            output.pop()
        }
    }

    function set_mode(mode) {
        modes.push(current_mode);
        current_mode = mode
    }

    function restore_mode() {
        do_block_just_closed = current_mode === "DO_BLOCK";
        current_mode = modes.pop()
    }

    function in_array(what, arr) {
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] === what) {
                return true
            }
        }
        return false
    }

    function get_next_token() {
        let n_newlines = 0;
        let c = "";

        do {
            if (parser_pos >= input.length) return ["", "TK_EOF"];
            c = input.charAt(parser_pos);
            parser_pos += 1;
            if (c === "\n") n_newlines += 1;
        } while (in_array(c, whitespace));

        if (n_newlines > 1)
            for (let i = 0; i < 2; i++)
                print_newline(i === 0);

        const wanted_newline = (n_newlines === 1);
        if (in_array(c, wordchar)) {
            if (parser_pos < input.length) {
                while (in_array(input.charAt(parser_pos), wordchar)) {
                    c += input.charAt(parser_pos);
                    parser_pos += 1;
                    if (parser_pos === input.length) break;
                }
            }
            if (parser_pos !== input.length && c.match(/^[0-9]+[Ee]$/) && input.charAt(parser_pos) === "-") {
                parser_pos += 1;
                const t = get_next_token(parser_pos);
                c += "-" + t[0];
                return [c, "TK_WORD"]
            }
            if (c === "in") return [c, "TK_OPERATOR"];
            return [c, "TK_WORD"]
        }
        if (c === "(" || c === "[") return [c, "TK_START_EXPR"];
        if (c === ")" || c === "]") return [c, "TK_END_EXPR"];
        if (c === "{") return [c, "TK_START_BLOCK"];
        if (c === "}") return [c, "TK_END_BLOCK"];
        if (c === ";") return [c, "TK_END_COMMAND"];
        if (c === "/") {
            let comment = "";
            if (input.charAt(parser_pos) === "*") {
                parser_pos += 1;
                if (parser_pos < input.length) {
                    while (!(input.charAt(parser_pos) === "*" && input.charAt(parser_pos + 1) && input.charAt(parser_pos + 1) === "/") && parser_pos < input.length) {
                        comment += input.charAt(parser_pos);
                        parser_pos += 1;
                        if (parser_pos >= input.length) break;
                    }
                }
                parser_pos += 2;
                return ["/*" + comment + "*/", "TK_BLOCK_COMMENT"]
            }
            if (input.charAt(parser_pos) === "/") {
                comment = c;
                while (input.charAt(parser_pos) !== "\x0d" && input.charAt(parser_pos) !== "\x0a") {
                    comment += input.charAt(parser_pos);
                    parser_pos += 1;
                    if (parser_pos >= input.length) break;
                }
                parser_pos += 1;
                if (wanted_newline) print_newline();
                return [comment, "TK_COMMENT"]
            }
        }
        if (c === "'" || c === '"' || (c === "/" && ((last_type === "TK_WORD" && last_text === "return") || (last_type === "TK_START_EXPR" || last_type === "TK_END_BLOCK" || last_type === "TK_OPERATOR" || last_type === "TK_EOF" || last_type === "TK_END_COMMAND")))) {
            const sep = c;
            let esc = false;
            c = "";
            if (parser_pos < input.length) {
                while (esc || input.charAt(parser_pos) !== sep) {
                    c += input.charAt(parser_pos);
                    if (!esc) esc = input.charAt(parser_pos) === "\\";
                    else esc = false;
                    parser_pos += 1;
                    if (parser_pos >= input.length) break;
                }
            }
            parser_pos += 1;
            if (last_type === "TK_END_COMMAND") print_newline();
            return [sep + c + sep, "TK_STRING"]
        }
        if (in_array(c, punct)) {
            while (parser_pos < input.length && in_array(c + input.charAt(parser_pos), punct)) {
                c += input.charAt(parser_pos);
                parser_pos += 1;
                if (parser_pos >= input.length) break;
            }
            return [c, "TK_OPERATOR"]
        }
        return [c, "TK_UNKNOWN"]
    }

    indent_character = indent_character || " ";
    indent_size = indent_size || 4;
    indent_string = "";
    while (indent_size--) indent_string += indent_character;
    input = js_source_text;
    last_word = "";
    last_type = "TK_START_EXPR";
    last_text = "";
    output = [];
    do_block_just_closed = false;
    var_line = false;
    var_line_tainted = false;
    whitespace = "\n\r\t ".split("");
    wordchar = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_$".split("");
    punct = "+ - * / % & ++ -- = += -= *= /= %= == === != !== > < >= <= >> << >>> >>>= >>= <<= && &= | || ! !! , : ? ^ ^= |=".split(" ");
    line_starters = "continue,try,throw,return,var,if,switch,case,default,for,while,break,function".split(",");
    current_mode = "BLOCK";
    modes = [current_mode];
    indent_level = indent_level || 0;
    parser_pos = 0;
    in_case = false;
    while (true) {
        const t = get_next_token(parser_pos);
        token_text = t[0];
        token_type = t[1];
        if (token_type === "TK_EOF") break;
        switch (token_type) {
            case"TK_START_EXPR":
                var_line = false;
                set_mode("EXPRESSION");
                if (last_type === "TK_END_EXPR" || last_type === "TK_START_EXPR") {
                } else {
                    if (last_type !== "TK_WORD" && last_type !== "TK_OPERATOR") {
                        print_space()
                    } else {
                        if (in_array(last_word, line_starters) && last_word !== "function") print_space();
                    }
                }
                print_token();
                break;
            case"TK_END_EXPR":
                print_token();
                restore_mode();
                break;
            case"TK_START_BLOCK":
                if (last_word === "do") set_mode("DO_BLOCK");
                else set_mode("BLOCK");
                if (last_type !== "TK_OPERATOR" && last_type !== "TK_START_EXPR") {
                    if (last_type === "TK_START_BLOCK") print_newline();
                    else print_space();
                }
                print_token();
                indent();
                break;
            case"TK_END_BLOCK":
                if (last_type === "TK_START_BLOCK") {
                    trim_output();
                    unindent()
                } else {
                    unindent();
                    print_newline()
                }
                print_token();
                restore_mode();
                break;
            case"TK_WORD":
                if (do_block_just_closed) {
                    print_space();
                    print_token();
                    print_space();
                    break
                }
                if (token_text === "case" || token_text === "default") {
                    if (last_text === ":") {
                        remove_indent()
                    } else {
                        unindent();
                        print_newline();
                        indent()
                    }
                    print_token();
                    in_case = true;
                    break
                }
                prefix = "NONE";
                if (last_type === "TK_END_BLOCK") {
                    if (!in_array(token_text.toLowerCase(), ["else", "catch", "finally"])) {
                        prefix = "NEWLINE"
                    } else {
                        prefix = "SPACE";
                        print_space()
                    }
                } else {
                    if (last_type === "TK_END_COMMAND" && (current_mode === "BLOCK" || current_mode === "DO_BLOCK")) {
                        prefix = "NEWLINE"
                    } else {
                        if (last_type === "TK_END_COMMAND" && current_mode === "EXPRESSION") {
                            prefix = "SPACE"
                        } else {
                            if (last_type === "TK_WORD") {
                                prefix = "SPACE"
                            } else {
                                if (last_type === "TK_START_BLOCK") {
                                    prefix = "NEWLINE"
                                } else {
                                    if (last_type === "TK_END_EXPR") {
                                        print_space();
                                        prefix = "NEWLINE"
                                    }
                                }
                            }
                        }
                    }
                }
                if (last_type !== "TK_END_BLOCK" && in_array(token_text.toLowerCase(), ["else", "catch", "finally"])) {
                    print_newline()
                } else {
                    if (in_array(token_text, line_starters) || prefix === "NEWLINE") {
                        if (last_text === "else") {
                            print_space()
                        } else {
                            if ((last_type === "TK_START_EXPR" || last_text === "=") && token_text === "function") {
                            } else {
                                if (last_type === "TK_WORD" && (last_text === "return" || last_text === "throw")) {
                                    print_space()
                                } else {
                                    if (last_type !== "TK_END_EXPR") {
                                        if ((last_type !== "TK_START_EXPR" || token_text !== "var") && last_text !== ":") {
                                            if (token_text === "if" && last_type === "TK_WORD" && last_word === "else") {
                                                print_space()
                                            } else {
                                                print_newline()
                                            }
                                        }
                                    } else {
                                        if (in_array(token_text, line_starters) && last_text !== ")") {
                                            print_newline()
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        if (prefix === "SPACE") print_space();
                    }
                }
                print_token();
                last_word = token_text;
                if (token_text === "var") {
                    var_line = true;
                    var_line_tainted = false
                }
                break;
            case"TK_END_COMMAND":
                print_token();
                var_line = false;
                break;
            case"TK_STRING":
                if (last_type === "TK_START_BLOCK" || last_type === "TK_END_BLOCK") {
                    print_newline()
                } else {
                    if (last_type === "TK_WORD") print_space();
                }
                print_token();
                break;
            case"TK_OPERATOR":
                let start_delim = true;
                let end_delim = true;
                if (var_line && token_text !== ",") {
                    var_line_tainted = true;
                    if (token_text === ":") var_line = false;
                }
                if (token_text === ":" && in_case) {
                    print_token();
                    print_newline();
                    break
                }
                in_case = false;
                if (token_text === ",") {
                    if (var_line) {
                        if (var_line_tainted) {
                            print_token();
                            print_newline();
                            var_line_tainted = false
                        } else {
                            print_token();
                            print_space()
                        }
                    } else {
                        if (last_type === "TK_END_BLOCK") {
                            print_token();
                            print_newline()
                        } else {
                            if (current_mode === "BLOCK") {
                                print_token();
                                print_newline()
                            } else {
                                print_token();
                                print_space()
                            }
                        }
                    }
                    break
                } else {
                    if (token_text === "--" || token_text === "++") {
                        if (last_text === ";") {
                            start_delim = true;
                            end_delim = false
                        } else {
                            start_delim = false;
                            end_delim = false
                        }
                    } else {
                        if (token_text === "!" && last_type === "TK_START_EXPR") {
                            start_delim = false;
                            end_delim = false
                        } else {
                            if (last_type === "TK_OPERATOR") {
                                start_delim = false;
                                end_delim = false
                            } else {
                                if (last_type === "TK_END_EXPR") {
                                    start_delim = true;
                                    end_delim = true
                                } else {
                                    if (token_text === ".") {
                                        start_delim = false;
                                        end_delim = false
                                    } else {
                                        if (token_text === ":") {
                                            start_delim = !!last_text.match(/^\d+$/);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if (start_delim) {
                    print_space()
                }
                print_token();
                if (end_delim) {
                    print_space()
                }
                break;
            case"TK_BLOCK_COMMENT":
                print_newline();
                print_token();
                print_newline();
                break;
            case"TK_COMMENT":
                print_space();
                print_token();
                print_newline();
                break;
            case"TK_UNKNOWN":
                print_token();
                break
        }
        last_type = token_type;
        last_text = token_text
    }
    return output.join("")
}

function style_html(html_source, indent_size, indent_character, max_char) {
    class Parser {
        constructor() {
            this.pos = 0;
            this.token = "";
            this.current_mode = "CONTENT";
            this.tags = {parent: "parent1", parent_count: 1, parent1: ""};
            this.tag_type = "";
            this.token_text = this.last_token = this.last_text = this.token_type = "";

            this.Utils = {
                whitespace: "\n\r\t ".split(""),
                single_token: "br,input,link,meta,!doctype,basefont,base,area,hr,wbr,param,img,isindex,?xml,embed".split(","),
                extra_liners: "head,body,/html".split(","),
                in_array: function (compare, array) {
                    for (let i = 0; i < array.length; i++)
                        if (compare === array[i]) return true;
                    return false
                }
            };

            this.get_content = function () {
                let _char = "";
                let content = [];
                let space = false;
                while (this.input.charAt(this.pos) !== "<") {
                    if (this.pos >= this.input.length) {
                        return content.length ? content.join("") : ["", "TK_EOF"]
                    }
                    _char = this.input.charAt(this.pos);
                    this.pos++;
                    this.line_char_count++;
                    if (this.Utils.in_array(_char, this.Utils.whitespace)) {
                        if (content.length) space = true;
                        this.line_char_count--;
                        continue
                    } else {
                        if (space) {
                            if (this.line_char_count >= this.max_char) {
                                content.push("\n");
                                for (let i = 0; i < this.indent_level; i++)
                                    content.push(this.indent_string);
                                this.line_char_count = 0
                            } else {
                                content.push(" ");
                                this.line_char_count++
                            }
                            space = false
                        }
                    }
                    content.push(_char)
                }
                return content.length ? content.join("") : ""
            };

            this.get_script = function () {
                let _char = "";
                const content = [];
                const reg_match = new RegExp("<\/script" + ">", "igm");
                reg_match.lastIndex = this.pos;
                const reg_array = reg_match.exec(this.input);
                const end_script = reg_array ? reg_array.index : this.input.length;
                while (this.pos < end_script) {
                    if (this.pos >= this.input.length)
                        return content.length ? content.join("") : ["", "TK_EOF"];
                    _char = this.input.charAt(this.pos);
                    this.pos++;
                    content.push(_char)
                }
                return content.length ? content.join("") : ""
            };

            this.record_tag = function (tag) {
                if (this.tags[tag + "count"]) {
                    this.tags[tag + "count"]++;
                    this.tags[tag + this.tags[tag + "count"]] = this.indent_level
                } else {
                    this.tags[tag + "count"] = 1;
                    this.tags[tag + this.tags[tag + "count"]] = this.indent_level
                }
                this.tags[tag + this.tags[tag + "count"] + "parent"] = this.tags.parent;
                this.tags.parent = tag + this.tags[tag + "count"]
            };

            this.retrieve_tag = function (tag) {
                if (this.tags[tag + "count"]) {
                    let temp_parent = this.tags.parent;
                    while (temp_parent) {
                        if (tag + this.tags[tag + "count"] === temp_parent) {
                            break
                        }
                        temp_parent = this.tags[temp_parent + "parent"]
                    }
                    if (temp_parent) {
                        this.indent_level = this.tags[tag + this.tags[tag + "count"]];
                        this.tags.parent = this.tags[temp_parent + "parent"]
                    }
                    delete this.tags[tag + this.tags[tag + "count"] + "parent"];
                    delete this.tags[tag + this.tags[tag + "count"]];
                    if (this.tags[tag + "count"] === 1) {
                        delete this.tags[tag + "count"]
                    } else {
                        this.tags[tag + "count"]--
                    }
                }
            };

            this.get_tag = function () {
                let comment;
                let _char = "";
                const content = [];
                let space = false;
                do {
                    if (this.pos >= this.input.length)
                        return content.length ? content.join("") : ["", "TK_EOF"];
                    _char = this.input.charAt(this.pos);
                    this.pos++;
                    this.line_char_count++;
                    if (this.Utils.in_array(_char, this.Utils.whitespace)) {
                        space = true;
                        this.line_char_count--;
                        continue
                    }
                    if (_char === "'" || _char === '"') {
                        if (!content[1] || content[1] !== "!") {
                            _char += this.get_unformatted(_char);
                            space = true
                        }
                    }
                    if (_char === "=") space = false;
                    if (content.length && content[content.length - 1] !== "=" && _char !== ">" && space) {
                        if (this.line_char_count >= this.max_char) {
                            this.print_newline(false, content);
                            this.line_char_count = 0
                        } else {
                            content.push(" ");
                            this.line_char_count++
                        }
                        space = false
                    }
                    content.push(_char)
                } while (_char !== ">");
                const tag_complete = content.join("");
                let tag_index;
                if (tag_complete.indexOf(" ") !== -1) {
                    tag_index = tag_complete.indexOf(" ")
                } else {
                    tag_index = tag_complete.indexOf(">")
                }
                const tag_check = tag_complete.substring(1, tag_index).toLowerCase();
                if (
                    tag_complete.charAt(tag_complete.length - 2) === "/"
                    || this.Utils.in_array(tag_check, this.Utils.single_token)
                ) {
                    this.tag_type = "SINGLE"
                } else {
                    if (tag_check === "script") {
                        this.record_tag(tag_check);
                        this.tag_type = "SCRIPT"
                    } else {
                        if (tag_check === "style") {
                            this.record_tag(tag_check);
                            this.tag_type = "STYLE"
                        } else {
                            if (tag_check.charAt(0) === "!") {
                                if (tag_check.indexOf("[if") !== -1) {
                                    if (tag_complete.indexOf("!IE") !== -1) {
                                        comment = this.get_unformatted("-->", tag_complete);
                                        content.push(comment)
                                    }
                                    this.tag_type = "START"
                                } else {
                                    if (tag_check.indexOf("[endif") !== -1) {
                                        this.tag_type = "END";
                                        this.unindent()
                                    } else {
                                        if (tag_check.indexOf("[cdata[") !== -1) {
                                            comment = this.get_unformatted("]]>", tag_complete);
                                            content.push(comment);
                                            this.tag_type = "SINGLE"
                                        } else {
                                            comment = this.get_unformatted("-->", tag_complete);
                                            content.push(comment);
                                            this.tag_type = "SINGLE"
                                        }
                                    }
                                }
                            } else {
                                if (tag_check.charAt(0) === "/") {
                                    this.retrieve_tag(tag_check.substring(1));
                                    this.tag_type = "END"
                                } else {
                                    this.record_tag(tag_check);
                                    this.tag_type = "START"
                                }
                                if (this.Utils.in_array(tag_check, this.Utils.extra_liners)) {
                                    this.print_newline(true, this.output)
                                }
                            }
                        }
                    }
                }
                return content.join("")
            };

            this.get_unformatted = function (delimiter, orig_tag) {
                if (orig_tag && orig_tag.indexOf(delimiter) !== -1) return "";
                let _char = "";
                let content = "";
                let space = true;
                do {
                    _char = this.input.charAt(this.pos);
                    this.pos++;
                    if (this.Utils.in_array(_char, this.Utils.whitespace)) {
                        if (!space) {
                            this.line_char_count--;
                            continue
                        }
                        if (_char === "\n" || _char === "\r") {
                            content += "\n";
                            for (let i = 0; i < this.indent_level; i++)
                                content += this.indent_string;
                            space = false;
                            this.line_char_count = 0;
                            continue
                        }
                    }
                    content += _char;
                    this.line_char_count++;
                    space = true
                } while (content.indexOf(delimiter) === -1);
                return content
            };

            this.get_token = function () {
                let token;
                if (this.last_token === "TK_TAG_SCRIPT") {
                    const temp_token = this.get_script();
                    if (typeof temp_token !== "string") return temp_token;
                    token = js_beautify(temp_token, this.indent_size, this.indent_character, this.indent_level);
                    return [token, "TK_CONTENT"]
                }
                if (this.current_mode === "CONTENT") {
                    token = this.get_content();
                    if (typeof token !== "string") {
                        return token
                    } else {
                        return [token, "TK_CONTENT"]
                    }
                }
                if (this.current_mode === "TAG") {
                    token = this.get_tag();
                    if (typeof token !== "string") {
                        return token
                    } else {
                        const tag_name_type = "TK_TAG_" + this.tag_type;
                        return [token, tag_name_type]
                    }
                }
            };

            this.printer = function (js_source, indent_character, indent_size, max_char) {
                this.input = js_source || "";
                this.output = [];
                this.indent_character = indent_character || " ";
                this.indent_string = "";
                this.indent_size = indent_size || 2;
                this.indent_level = 0;
                this.max_char = max_char || 7000;
                this.line_char_count = 0;
                for (let i = 0; i < this.indent_size; i++) {
                    this.indent_string += this.indent_character
                }
                this.print_newline = function (ignore, array) {
                    this.line_char_count = 0;
                    if (!array || !array.length) {
                        return
                    }
                    if (!ignore) {
                        while (this.Utils.in_array(array[array.length - 1], this.Utils.whitespace)) {
                            array.pop()
                        }
                    }
                    array.push("\n");
                    for (let i = 0; i < this.indent_level; i++) {
                        array.push(this.indent_string)
                    }
                };
                this.print_token = function (text) {
                    this.output.push(text)
                };
                this.indent = function () {
                    this.indent_level++
                };
                this.unindent = function () {
                    if (this.indent_level > 0) {
                        this.indent_level--
                    }
                }
            };
            return this
        }
    }

    let multi_parser = new Parser();
    multi_parser.printer(html_source, indent_character, indent_size);
    let f = true;
    while (true) {
        const t = multi_parser.get_token();
        multi_parser.token_text = t[0];
        multi_parser.token_type = t[1];
        if (multi_parser.token_type === "TK_EOF") break;
        switch (multi_parser.token_type) {
            case"TK_TAG_START":
            case"TK_TAG_SCRIPT":
            case"TK_TAG_STYLE":
                multi_parser.print_newline(false, multi_parser.output);
                multi_parser.print_token(multi_parser.token_text);
                multi_parser.indent();
                multi_parser.current_mode = "CONTENT";
                break;
            case"TK_TAG_END":
                if (f) {
                    multi_parser.print_newline(true, multi_parser.output)
                }
                multi_parser.print_token(multi_parser.token_text);
                multi_parser.current_mode = "CONTENT";
                f = true;
                break;
            case"TK_TAG_SINGLE":
                multi_parser.print_newline(false, multi_parser.output);
                multi_parser.print_token(multi_parser.token_text);
                multi_parser.current_mode = "CONTENT";
                break;
            case"TK_CONTENT":
                if (multi_parser.token_text !== "") {
                    f = false;
                    multi_parser.print_token(multi_parser.token_text)
                }
                multi_parser.current_mode = "TAG";
                break
        }
        multi_parser.last_token = multi_parser.token_type;
        multi_parser.last_text = multi_parser.token_text
    }
    return multi_parser.output.join("")
}
