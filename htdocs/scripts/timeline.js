//******************************************************************************************
//* Represents the timeline
//******************************************************************************************
Vis.Timeline = {
    _data       : null,
    BackColor   : '#fff',   //back color of the control
    BinColor    : '#0f0',   //color of the bins
    Width       : 2,        //timeline width (local coords)
    Height      : 0.3,      //timeline height (local coords)
    Date1       : null,     //date for rearrangement
    Date2       : null,     //date for rearrangement
    //******************************************************************************************
    //* @PUBLIC: Initializes the timeline
    //  @PARAM: data [object]: an array which contains the month values 
    //      data.start [int] ... the first month (e.g 052002)
    //      data.end [int] ... the last month (e.g. 122010)
    //      data.max [int] ... the maximum amount
    //      data.items [array] ... contains the items
    //          item.month [int] ... the month
    //          item.year [int] ... the year
    //          item.amount [int] ... the amount
    //          item.selected [bool] ... true if the item is selected
    //******************************************************************************************
    Init        : function(data) {
        this._data = data;
    },
    //******************************************************************************************
    //* Draws a filled rectangle
    //******************************************************************************************
    DrawFilledRect : function(location, size, color) {
        var gl = Vis.WebGL.Context;

        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(Vis.WebGL.Shaders.TimelineShader.vertexPositionAttribute);
        gl.vertexAttribPointer(Vis.WebGL.Shaders.TimelineShader.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
        
        var x1 = location.x;
        var x2 = location.x + size.width;
        var y1 = location.y;
        var y2 = location.y + size.height;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            x1, y1,
            x2, y1,
            x1, y2,
            x1, y2,
            x2, y1,
            x2, y2
        ]), gl.STATIC_DRAW);
        gl.uniform4f(gl.getUniformLocation(Vis.WebGL.Shaders.TimelineShader, "uColor"), 
            color.red, color.green, color.blue, color.alpha
        );

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    //******************************************************************************************
    //* Draws the border of a rectangle
    //******************************************************************************************
    DrawBorder : function(location, size, color, thickness) {
        //bottom part
        if (thickness.bottom && thickness.bottom != 0) {
            this.DrawFilledRect(location, { 
                width   : size.width, 
                height  : thickness.bottom
            }, color);
        }

        //top part
        if (thickness.top && thickness.top != 0) {
            this.DrawFilledRect({
                x       : location.x,
                y       : location.y + size.height - thickness.top
            }, { 
                width   : size.width, 
                height  : thickness.top
            }, color);
        }

        //left part
        if (thickness.left && thickness.left != 0) {
            this.DrawFilledRect(location, { 
                width   : thickness.left, 
                height  : size.height
            }, color);
        }

        //right part
        if (thickness.right && thickness.right != 0) {
            this.DrawFilledRect({
                x       : location.x + size.width - thickness.right,
                y       : location.y
            }, { 
                width   : thickness.right, 
                height  : size.height
            }, color);
        }
    },
    //******************************************************************************************
    //* Draws the timeline
    //******************************************************************************************
    Draw : function() {
        var gl = Vis.WebGL.Context;
        var w = this.Width;
        var h = this.Height;

        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

        var shaderProgram = Vis.WebGL.Shaders.TimelineShader;
        gl.useProgram(shaderProgram);
        shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
        
        //define colors
        var colors = {
            timelineBack    : { 
                red         : 1.0, 
                green       : 1.0, 
                blue        : 1.0, 
                alpha       : 1.0 
            },
            binSelected     : {
                red         : 0.4, 
                green       : 0.71, 
                blue        : 0.88, 
                alpha       : 1.0 
            },
            binUnSelected   : {
                red         : 0.9, 
                green       : 0.9, 
                blue        : 0.9, 
                alpha       : 1.0 
            },
            border          : {
                red         : 0.84, 
                green       : 0.98, 
                blue        : 0.96, 
                alpha       : 1.0 
            }
        };

        //timeline sections
        var d = this._data;
        var sWidth = w / d.items.length;
        for (var i = 0; i < this._data.items.length; ++i) {
            var sHeight = d.items[i].a / d.max * h;
            this.DrawFilledRect({ x : -1 + (i * sWidth), y : -1 }, { width : 0.002, height : h }, colors.border);
            this.DrawFilledRect({ x : -1 + (i * sWidth), y : -1 }, { width : sWidth, height : sHeight }, (d.items[i].s) ? colors.binSelected : colors.binUnSelected);
        }

        //timeline rectangle
        this.DrawBorder({ x : -1, y : -1 }, { width : w, height : h }, colors.border, { left : 0.005, top : 0.005, right : 0.005, bottom : 0.005 });
        this.DrawFilledRect({ x : -1, y : -1 }, { width : w, height : h }, colors.timelineBack);
    },
    //******************************************************************************************
    //* @PUBLIC: Shows the rearrange view
    //******************************************************************************************
    ShowRearrangeView : function() {
        var view = $('rearrange');
        view.show();
        if (Vis.Drawing) {
            Vis.Drawing.ClearText();
        }
    },
    //******************************************************************************************
    //* @PUBLIC: Hides the rearrange view
    //******************************************************************************************
    HideRearrangeView : function() {
        var view = $('rearrange');
        view.hide();
    },
    //******************************************************************************************
    //* @PUBLIC: Gets the item index based on the provided x-coordinate (localized)
    //******************************************************************************************
    GetItemIndexBy : function(x) {
        var sWidth = this.Width / this._data.items.length;
        //todo: for sure there is an easy formular to calculate the position but for now i dont see it
        for (var i = 0; i < this._data.items.length; ++i) {
            if ((-1 + i * sWidth) <= x && x <= (-1 + (i + 1) * sWidth))
                return i;
        }
    },
    //******************************************************************************************
    //* @PUBLIC: Change the selection state of an item (sets it to true)
    //******************************************************************************************
    SelectItem : function(idx) {
        if (idx < 0 || idx > this._data.items.length)
            return false;

        if (!this._data.items[idx].s) {
            this._data.items[idx].s = true;
            return true;
        } else {
            return false;
        }
    },
    //******************************************************************************************
    //* @PUBLIC: Selects all items
    //******************************************************************************************
    SelectAllItems : function() {
        for (var i = 0; i < this._data.items.length; ++i) {
            this._data.items[i].s = true;
        }
    },
    //******************************************************************************************
    //* @PUBLIC: Change the selection state of all items to unselected, except for the one
    //* at the provided index
    //******************************************************************************************
    UnselectAllItemsBut : function(index) {
        for (var i = 0; i < this._data.items.length; ++i) {
            this._data.items[i].s = (i == index);
        }
    },
    //******************************************************************************************
    //* @PUBLIC: Change the selection state of all items to unselected, except the items in the
    //* provided date time range
    //******************************************************************************************
    UnselectButDaterange : function(sd, ed) {
        for (var i = 0; i < this._data.items.length; ++i) {
            var d = new Date(this._data.items[i].y, this._data.items[i].m, 1);
            this._data.items[i].s = (d >= sd && d <= ed);
        }
        this.ToggleRearrangeButton(true);
    },
    //******************************************************************************************
    //* @PUBLIC: Sets the start/end date to the provided index value
    //******************************************************************************************
    SetDaterange : function(start, index) {
        var m = this._data.items[index].m;
        var y = this._data.items[index].y;
        
        var lbl = null;
        if (start) {
            this.Date1 = new Date(y, m, 1);
            lbl = $('ra-first');
        } else {
            this.Date2 = new Date(y, m, 1);
            lbl = $('ra-second');
        }

        if (this.Date2 == null) {
            this.UnselectAllItemsBut(index);
        } else {
            if (this.Date1 == null)
                this.Date1 = this.Date2;

            if (this.Date1 < this.Date2)
                this.UnselectButDaterange(this.Date1, this.Date2);
            else
                this.UnselectButDaterange(this.Date2, this.Date1);
        }

        if (lbl) {
            lbl.innerHTML = m + "-" + y;
        }
    },
    //******************************************************************************************
    //* @PRIVATE: Toggles the rearrange button
    //******************************************************************************************
    ToggleRearrangeButton : function(enable) {
        var btn = $('btnRearrange');
        if (enable)
            btn.enable();
        else
            btn.disable();
    },
    //******************************************************************************************
    //* @PRIVATE: Resets the date to null
    //******************************************************************************************
    ResetDates : function() {
        this.Date1 = null;
        this.Date2 = null;
    },
    //******************************************************************************************
    //* @PUBLIC: Returns the selected date range or null if empty
    //******************************************************************************************
    GetSelectedRange : function() {
        if (this.Date1 != null && this.Date2 != null) {
            if (this.Date1 < this.Date2) {
                return {
                    sd : this.Date1.toJSON(),
                    ed : this.Date2.toJSON()
                };
            } else {
                return {
                    sd : this.Date2.toJSON(),
                    ed : this.Date1.toJSON()
                };
            }
        } else 
            return null;
    },
    //******************************************************************************************
    //* @PUBLIC: Updates the text in the status label
    //******************************************************************************************
    UpdateStatusLabel : function(index) {
        var lbl = $('tl-status');
        var my = this._data.items[index].m + "-" + this._data.items[index].y;
        var am = this._data.items[index].a;
        lbl.innerHTML = "Month: " + my + ", Number of revisions: " + am;
    }
};

//******************************************************************************************
//* Mainly button events for the timeline
//******************************************************************************************
Vis.Timeline.Events = {
    //******************************************************************************************
    //* Raised when the rearrange button has been clicked
    //******************************************************************************************
    OnButtonRearrangeClick : function() {
        Vis.Timeline.ToggleRearrangeButton(false);
        Vis.Load(Vis.Timeline.GetSelectedRange());
        Vis.Timeline.HideRearrangeView();
        Vis.Timeline.ResetDates();
    },
    //******************************************************************************************
    //* Raised when the cancel button has been clicked
    //******************************************************************************************
    OnButtonCancelClick : function() {
        Vis.Timeline.ResetDates();
        Vis.Timeline.ToggleRearrangeButton(false);
        Vis.Timeline.SelectAllItems();
        Vis.Timeline.HideRearrangeView();
        Vis.Load();
    }
};