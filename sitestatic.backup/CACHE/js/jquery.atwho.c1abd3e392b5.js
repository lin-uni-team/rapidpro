// Generated by CoffeeScript 1.10.0

/*
  Implement Github like autocomplete mentions
  http://ichord.github.com/At.js

  Copyright (c) 2013 chord.luo@gmail.com
  Licensed under the MIT license.
 */

(function() {
  var slice = [].slice;

  (function(factory) {
    if (typeof define === 'function' && define.amd) {
      return define(['jquery'], factory);
    } else {
      return factory(window.jQuery);
    }
  })(function($) {
    var $CONTAINER, Api, Controller, DEFAULT_CALLBACKS, DEFAULT_TPL, KEY_CODE, Model, View;
    KEY_CODE = {
      DOWN: 40,
      UP: 38,
      ESC: 27,
      TAB: 9,
      ENTER: 13
    };
    DEFAULT_CALLBACKS = {
      before_save: function(data) {
        var i, item, len, results;
        if (!$.isArray(data)) {
          return data;
        }
        results = [];
        for (i = 0, len = data.length; i < len; i++) {
          item = data[i];
          if ($.isPlainObject(item)) {
            results.push(item);
          } else {
            results.push({
              name: item
            });
          }
        }
        return results;
      },
      matcher: function(flag, subtext) {
        var match, regexp;
        flag = '(?:^|\\s)' + flag.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        regexp = new RegExp(flag + '([A-Za-z0-9_\+\-]*)$|' + flag + '([^\\x00-\\xff]*)$', 'gi');
        match = regexp.exec(subtext);
        if (match) {
          return match[2] || match[1];
        } else {
          return null;
        }
      },
      filter: function(query, data, search_key) {
        var _results, i, item, len;
        _results = [];
        for (i = 0, len = data.length; i < len; i++) {
          item = data[i];
          if (~item[search_key].toLowerCase().indexOf(query)) {
            _results.push(item);
          }
        }
        return _results;
      },
      remote_filter: null,
      sorter: function(query, items, search_key) {
        var _results, i, item, len;
        if (!query) {
          return items;
        }
        _results = [];
        for (i = 0, len = items.length; i < len; i++) {
          item = items[i];
          item.atwho_order = item[search_key].toLowerCase().indexOf(query);
          if (item.atwho_order > -1) {
            _results.push(item);
          }
        }
        return _results.sort(function(a, b) {
          return a.atwho_order - b.atwho_order;
        });
      },
      tpl_eval: function(tpl, map) {
        var error, error1;
        try {
          return tpl.replace(/\$\{([^\}]*)\}/g, function(tag, key, pos) {
            return map[key];
          });
        } catch (error1) {
          error = error1;
          return "";
        }
      },
      highlighter: function(li, query) {
        var regexp;
        if (!query) {
          return li;
        }
        regexp = new RegExp(">\\s*(\\w*)(" + query.replace("+", "\\+") + ")(\\w*)\\s*<", 'ig');
        return li.replace(regexp, function(str, $1, $2, $3) {
          return '> ' + $1 + '<strong>' + $2 + '</strong>' + $3 + ' <';
        });
      },
      before_insert: function(value, $li, selectionEvent) {
        return value;
      }
    };
    Model = (function() {
      var _storage;

      _storage = {};

      function Model(context, key1) {
        this.context = context;
        this.key = key1;
      }

      Model.prototype.saved = function() {
        return this.fetch() > 0;
      };

      Model.prototype.query = function(query, callback) {
        var data, ref, search_key;
        data = this.fetch();
        search_key = this.context.get_opt("search_key");
        callback(data = this.context.callbacks('filter').call(this.context, query, data, search_key));
        if (!(data && data.length > 0)) {
          return (ref = this.context.callbacks('remote_filter')) != null ? ref.call(this.context, query, callback) : void 0;
        }
      };

      Model.prototype.fetch = function() {
        return _storage[this.key] || [];
      };

      Model.prototype.save = function(data) {
        return _storage[this.key] = this.context.callbacks("before_save").call(this.context, data || []);
      };

      Model.prototype.load = function(data) {
        if (!(this.saved() || !data)) {
          return this._load(data);
        }
      };

      Model.prototype.reload = function(data) {
        return this._load(data);
      };

      Model.prototype._load = function(data) {
        if (typeof data === "string") {
          return $.ajax(data, {
            dataType: "json"
          }).done((function(_this) {
            return function(data) {
              return _this.save(data);
            };
          })(this));
        } else {
          return this.save(data);
        }
      };

      return Model;

    })();
    Controller = (function() {
      var _uuid, uuid;

      _uuid = 0;

      uuid = function() {
        return _uuid += 1;
      };

      function Controller(inputor) {
        this.id = inputor.id || uuid();
        this.settings = {};
        this.pos = 0;
        this.current_flag = null;
        this.query = null;
        this.the_flag = {};
        this._views = {};
        this._models = {};
        this.$inputor = $(inputor);
        $CONTAINER.append(this.$el = $("<div id='atwho-ground-" + this.id + "'></div>"));
        this.listen();
      }

      Controller.prototype.listen = function() {
        return this.$inputor.on('keyup.atwho', (function(_this) {
          return function(e) {
            return _this.on_keyup(e);
          };
        })(this)).on('keydown.atwho', (function(_this) {
          return function(e) {
            return _this.on_keydown(e);
          };
        })(this)).on('scroll.atwho', (function(_this) {
          return function(e) {
            var ref;
            return (ref = _this.view) != null ? ref.hide() : void 0;
          };
        })(this)).on('blur.atwho', (function(_this) {
          return function(e) {
            var ref;
            return (ref = _this.view) != null ? ref.hide(_this.get_opt("display_timeout")) : void 0;
          };
        })(this));
      };

      Controller.prototype.set_context_for = function(flag) {
        flag = this.current_flag = this.the_flag[flag];
        this.view = this._views[flag];
        this.model = this._models[flag];
        return this;
      };

      Controller.prototype.reg = function(flag, settings) {
        var setting;
        setting = this.settings[flag] = $.extend({}, this.settings[flag] || $.fn.atwho["default"], settings);
        this.set_context_for(flag = (setting.alias ? this.the_flag[setting.alias] = flag : void 0, this.the_flag[flag] = flag));
        (this._models[flag] = new Model(this, flag)).reload(setting.data);
        this._views[flag] = new View(this, flag);
        return this;
      };

      Controller.prototype.trigger = function(name, data) {
        var alias, event_name;
        data.push(this);
        alias = this.get_opt('alias');
        event_name = alias ? name + "-" + alias + ".atwho" : name + ".atwho";
        return this.$inputor.trigger(event_name, data);
      };

      Controller.prototype.super_call = function() {
        var args, error, error1, func_name;
        func_name = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
        try {
          return DEFAULT_CALLBACKS[func_name].apply(this, args);
        } catch (error1) {
          error = error1;
          return $.error(error + " Or maybe At.js doesn't have function " + func_name);
        }
      };

      Controller.prototype.callbacks = function(func_name) {
        return this.get_opt("callbacks")[func_name] || DEFAULT_CALLBACKS[func_name];
      };

      Controller.prototype.get_opt = function(key, default_value) {
        var e, error1;
        try {
          return this.settings[this.current_flag][key];
        } catch (error1) {
          e = error1;
          return null;
        }
      };

      Controller.prototype.rect = function() {
        var c, scale_bottom;
        c = this.$inputor.caret('offset', this.pos - 1);
        scale_bottom = document.selection ? 0 : 2;
        return {
          left: c.left,
          top: c.top,
          bottom: c.top + c.height + scale_bottom
        };
      };

      Controller.prototype.catch_query = function() {
        var caret_pos, content, end, query, ref, start, subtext;
        content = this.$inputor.val();
        caret_pos = this.$inputor.caret('pos');
        subtext = content.slice(0, caret_pos);
        query = null;
        $.map(this.settings, (function(_this) {
          return function(setting) {
            var _result;
            _result = _this.callbacks("matcher").call(_this, setting.at, subtext);
            if (_result != null) {
              query = _result;
              return _this.set_context_for(setting.at);
            }
          };
        })(this));
        if (typeof query === "string" && query.length <= this.get_opt('max_len', 20)) {
          start = caret_pos - query.length;
          end = start + query.length;
          this.pos = start;
          query = {
            'text': query.toLowerCase(),
            'head_pos': start,
            'end_pos': end
          };
          this.trigger("matched", [this.current_flag, query.text]);
        } else {
          if ((ref = this.view) != null) {
            ref.hide();
          }
        }
        return this.query = query;
      };

      Controller.prototype.insert = function(str) {
        var $inputor, flag_len, pos, source, space, start_str, text;
        $inputor = this.$inputor;
        str = '' + str;
        source = $inputor.val();
        flag_len = this.get_opt("display_flag") ? 0 : this.current_flag.length;
        start_str = source.slice(0, (this.query['head_pos'] || 0) - flag_len);
        pos = start_str.length + str.length;
        space = "";
        if (this.get_opt("insert_space")) {
          pos++;
          space = " ";
        }
        text = ("" + start_str + str) + space + ("" + (source.slice(this.query['end_pos'] || 0)));
        $inputor.val(text);
        $inputor.caret('pos', pos);
        return $inputor.change();
      };

      Controller.prototype.on_keyup = function(e) {
        switch (e.keyCode) {
          case KEY_CODE.ESC:
            e.preventDefault();
            this.view.hide();
            break;
          case KEY_CODE.DOWN:
          case KEY_CODE.UP:
            $.noop();
            break;
          default:
            this.look_up();
        }
      };

      Controller.prototype.on_keydown = function(e) {
        var ref;
        if (!((ref = this.view) != null ? ref.visible() : void 0)) {
          return;
        }
        switch (e.keyCode) {
          case KEY_CODE.ESC:
            e.preventDefault();
            this.view.hide();
            break;
          case KEY_CODE.UP:
            e.preventDefault();
            this.view.prev();
            break;
          case KEY_CODE.DOWN:
            e.preventDefault();
            this.view.next();
            break;
          case KEY_CODE.TAB:
          case KEY_CODE.ENTER:
            if (!this.view.visible()) {
              return;
            }
            e.preventDefault();
            this.view.choose(e);
            break;
          default:
            $.noop();
        }
      };

      Controller.prototype.render_view = function(data) {
        var search_key;
        search_key = this.get_opt("search_key");
        data = this.callbacks("sorter").call(this, this.query.text, data.slice(0, 1001), search_key);
        return this.view.render(data.slice(0, this.get_opt('limit')));
      };

      Controller.prototype.look_up = function() {
        var _callback, query;
        if (!(query = this.catch_query())) {
          return;
        }
        _callback = function(data) {
          if (data && data.length > 0) {
            return this.render_view(data);
          } else {
            return this.view.hide();
          }
        };
        return this.model.query(query.text, $.proxy(_callback, this));
      };

      return Controller;

    })();
    View = (function() {
      function View(context, key1) {
        this.context = context;
        this.key = key1;
        this.id = this.context.get_opt("alias") || ("at-view-" + (this.key.charCodeAt(0)));
        this.$el = $("<div id='" + this.id + "' class='atwho-view'><ul id='" + this.id + "-ul' class='atwho-view-url'></ul></div>");
        this.timeout_id = null;
        this.context.$el.append(this.$el);
        this.bind_event();
      }

      View.prototype.bind_event = function() {
        var $menu;
        $menu = this.$el.find('ul');
        return $menu.on('mouseenter.view', 'li', function(e) {
          $menu.find('.cur').removeClass('cur');
          return $(e.currentTarget).addClass('cur');
        }).on('click', (function(_this) {
          return function(e) {
            _this.choose(e);
            return e.preventDefault();
          };
        })(this));
      };

      View.prototype.visible = function() {
        return this.$el.is(":visible");
      };

      View.prototype.choose = function(selectionEvent) {
        var $li;
        $li = this.$el.find(".cur");
        this.context.insert(this.context.callbacks("before_insert").call(this.context, $li.data("value"), $li, selectionEvent));
        this.context.trigger("inserted", [$li, selectionEvent]);
        return this.hide();
      };

      View.prototype.reposition = function() {
        var offset, rect;
        rect = this.context.rect();
        if (rect.bottom + this.$el.height() - $(window).scrollTop() > $(window).height()) {
          rect.bottom = rect.top - this.$el.height();
        }
        offset = {
          left: rect.left,
          top: rect.bottom
        };
        this.$el.offset(offset);
        return this.context.trigger("reposition", [offset]);
      };

      View.prototype.next = function() {
        var cur, next;
        cur = this.$el.find('.cur').removeClass('cur');
        next = cur.next();
        if (!next.length) {
          next = this.$el.find('li:first');
        }
        return next.addClass('cur');
      };

      View.prototype.prev = function() {
        var cur, prev;
        cur = this.$el.find('.cur').removeClass('cur');
        prev = cur.prev();
        if (!prev.length) {
          prev = this.$el.find('li:last');
        }
        return prev.addClass('cur');
      };

      View.prototype.show = function() {
        if (!this.visible()) {
          this.$el.show();
        }
        return this.reposition();
      };

      View.prototype.hide = function(time) {
        var callback;
        if (isNaN(time && this.visible())) {
          return this.$el.hide();
        } else {
          callback = (function(_this) {
            return function() {
              return _this.hide();
            };
          })(this);
          clearTimeout(this.timeout_id);
          return this.timeout_id = setTimeout(callback, time);
        }
      };

      View.prototype.render = function(list) {
        var $li, $ul, i, item, len, li, tpl;
        if (!$.isArray(list || list.length <= 0)) {
          this.hide();
          return;
        }
        this.$el.find('ul').empty();
        $ul = this.$el.find('ul');
        tpl = this.context.get_opt('tpl', DEFAULT_TPL);
        for (i = 0, len = list.length; i < len; i++) {
          item = list[i];
          li = this.context.callbacks("tpl_eval").call(this.context, tpl, item);
          $li = $(this.context.callbacks("highlighter").call(this.context, li, this.context.query.text));
          $li.data("atwho-info", item);
          $ul.append($li);
        }
        this.show();
        return $ul.find("li:first").addClass("cur");
      };

      return View;

    })();
    DEFAULT_TPL = "<li data-value='${name}'>${name}</li>";
    Api = {
      init: function(options) {
        var $this, app;
        app = ($this = $(this)).data("atwho");
        if (!app) {
          $this.data('atwho', (app = new Controller(this)));
        }
        return app.reg(options.at, options);
      },
      load: function(flag, data) {
        this.set_context_for(flag);
        return this.model.load(data);
      },
      run: function() {
        return this.look_up();
      }
    };
    $CONTAINER = $("<div id='atwho-container'></div>");
    $.fn.atwho = function(method) {
      var _args;
      _args = arguments;
      $('body').append($CONTAINER);
      return this.filter('textarea, input').each(function() {
        var app;
        if (typeof method === 'object' || !method) {
          return Api.init.apply(this, _args);
        } else if (Api[method]) {
          if (app = $(this).data('atwho')) {
            return Api[method].apply(app, Array.prototype.slice.call(_args, 1));
          }
        } else {
          return $.error("Method " + method + " does not exist on jQuery.caret");
        }
      });
    };
    return $.fn.atwho["default"] = {
      at: void 0,
      alias: void 0,
      data: null,
      tpl: DEFAULT_TPL,
      callbacks: DEFAULT_CALLBACKS,
      search_key: "name",
      limit: 5,
      max_len: 20,
      insert_space: true,
      display_flag: true,
      display_timeout: 300
    };
  });

}).call(this);
