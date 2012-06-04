//******************************************************************************************
//* Represents the timeline
//******************************************************************************************
Vis.Timeline = {
    _data       : null,
    BackColor   : '#fff',   //back color of the control
    BinColor    : '#0f0',   //color of the bins
    Width       : 2,        //timeline width (local coords)
    Height      : 0.3,      //timeline height (local coords)
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
        //this._data = data;
        //Debug
        this._data = {
            start       : 012010,
            end         : 062010,
            max         : 7,
            items       : [{
                month   : 1,
                year    : 2010,
                amount  : 2,
                selected: false
            }, {
                month   : 2,
                year    : 2010,
                amount  : 5,
                selected: true
            }, {
                month   : 3,
                year    : 2010,
                amount  : 1,
                selected: true
            }, {
                month   : 4,
                year    : 2010,
                amount  : 7,
                selected: true
            }, {
                month   : 5,
                year    : 2010,
                amount  : 3,
                selected: false
            }, {
                month   : 6,
                year    : 2010,
                amount  : 4,
                selected: false
            }]
        };
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
            var sHeight = d.items[i].amount / d.max * h;
            this.DrawFilledRect({ x : -1 + (i * sWidth), y : -1 }, { width : 0.002, height : h }, colors.border);
            this.DrawFilledRect({ x : -1 + (i * sWidth), y : -1 }, { width : sWidth, height : sHeight }, (d.items[i].selected) ? colors.binSelected : colors.binUnSelected);
        }

        //timeline rectangle
        this.DrawBorder({ x : -1, y : -1 }, { width : w, height : h }, colors.border, { left : 0.005, top : 0.005, right : 0.005, bottom : 0.005 });
        this.DrawFilledRect({ x : -1, y : -1 }, { width : w, height : h }, colors.timelineBack);
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

        if (!this._data.items[idx].selected) {
            this._data.items[idx].selected = true;
            return true;
        } else {
            return false;
        }
    }
};
