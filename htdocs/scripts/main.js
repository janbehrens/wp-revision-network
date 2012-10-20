//******************************************************************************************
//* Main visualization namespace
//******************************************************************************************
Vis = {
    //******************************************************************************************
    //* Loads the webgl screen and hides the welcome screen
    //* if a daterange object is provided the calculation is based on this range
    //******************************************************************************************
    Load : function(daterange) {
        if ($F('article') == "") {
            alert("Please choose an article first!");
            return;
        }

        var noData = false;

        //get main data
        Vis.ToggleLoading(false);
        new Ajax.Request('data.php', {
			parameters      : {
				'load'      : true,
				'wiki'      : $F('wiki'),
                'article'   : $F('article'),
                'dmax'      : $F('dmax'),
                'sd'        : (daterange) ? daterange.sd : '',
                'ed'        : (daterange) ? daterange.ed : ''
			},
			onSuccess       : function(transport) {
				var res = transport.responseText.evalJSON();
                if (res.positions) {
                    if (res.positions.length == 0) {
                        noData = true;
                    }
                }

                //get timeline data
                new Ajax.Request('data.php', {
			        parameters      : {
				        'timeline'  : true,
				        'wiki'      : $F('wiki'),
                        'article'   : $F('article'),
                        'sd'        : (daterange) ? daterange.sd : '',
                        'ed'        : (daterange) ? daterange.ed : ''
			        },
			        onSuccess       : function(transport) {
				        var tlres = transport.responseText.evalJSON();

                        $('welcome-screen').hide();
                        $('vis-canvas').show();

                        Vis.WebGL.Init(res.positions, res.skewness, res.rsdmin, res.rsdmax, tlres);
                        Vis.ToggleLoading(true);
                        if (noData) {
                            Vis.ShowErrorScreen();
                        }
			        },
			        onFailure       : function(transport) {
                        Vis.ToggleLoading(true);
				        alert("Loading failed!\nPossible reason: " + transport.responseText);
			        }
		        });
                
			},
			onFailure       : function(transport) {
                Vis.ToggleLoading(true);
				alert("Loading failed!\nPossible reason: " + transport.responseText);
			}
		});
    },
    //******************************************************************************************
    //* Toggles the loading indicator
    //******************************************************************************************
    ToggleLoading : function(complete) {
        Vis.HideErrorScreen();
        var li = $('loading');
        var btn = $('btnLoad');

        if (complete) {
            btn.enable();
            li.hide();
        } else {
            btn.disable();
            li.show();
        }
    },
    //******************************************************************************************
    //* Shows the error screen
    //******************************************************************************************
    ShowErrorScreen : function() {
        $('error-screen').show();
        Vis.Drawing.ClearText();
    },
    //******************************************************************************************
    //* Hides the error screen
    //******************************************************************************************
    HideErrorScreen : function() {
        $('error-screen').hide();
    }
};

//******************************************************************************************
//* WebGL stuff
//******************************************************************************************
Vis.WebGL = {
    Context : null,     //contains the WebGL context
    //******************************************************************************************
    //* @PUBLIC: Initializes the WebGL stuff
    //******************************************************************************************
    Init : function(positions, s, rsdmin, rsdmax, tl) {
        Vis.WebGL.Canvas.Init();
        if (!Vis.WebGL.CreateContext()) {
            alert("Could not initialise WebGL!");
            return;
        }

        Vis.WebGL.Shaders.Init();
        
        if (Vis.Drawing) {
            Vis.Drawing.Init(positions, s, rsdmin, rsdmax);
        }
        if (Vis.Timeline) {
            Vis.Timeline.Init(tl);
        }

        Vis.WebGL.Context.clearColor(0.9, 0.9, 0.9, 1.0);
        Vis.WebGL.Context.enable(Vis.WebGL.Context.DEPTH_TEST);

        Vis.WebGL.Scene.Draw();
    },
    //******************************************************************************************
    //* @PRIVATE:   Create the WebGL context
    //* @RETURN:    [bool] true if WebGL context has been created
    //******************************************************************************************
    CreateContext : function() {
        try {
            Vis.WebGL.Context = Vis.WebGL.Canvas.Get().getContext("experimental-webgl");
            Vis.WebGL.Context.viewportWidth = Vis.WebGL.Canvas.Width;
            Vis.WebGL.Context.viewportHeight = Vis.WebGL.Canvas.Height;
            return true;
        } catch (e) {
            return false;
        }
        if (!Vis.WebGL.Context) {
            return false;
        }
    }
};

//******************************************************************************************
//* Canvas wrapper
//******************************************************************************************
Vis.WebGL.Canvas = {
    Id      : 'vis-canvas',         //id of the canvas object
    Width   : 920,                  //canvas width (change for different size)
    Height  : 500,                  //canvas height (change for different size)
    Left    : 0,                    //canvas left (automatically set!)
    Top     : 0,                    //canvas top (automatically set!)
    //******************************************************************************************
    //* Gets the canvas object itself
    //******************************************************************************************
    Get : function() {
        return $(this.Id);
    },
    //******************************************************************************************
    //* Canvas wrapper
    //******************************************************************************************
    Init : function() {
        this.SetupLayout();
        this.RegisterEvents();
    },
    //******************************************************************************************
    //* @PRIVATE:   Registers mouse events
    //******************************************************************************************
    RegisterEvents : function() {
        var canvas = this.Get();
        canvas.onmousemove = Vis.WebGL.Canvas.Events.OnMouseMove; 
        canvas.onmousedown = Vis.WebGL.Canvas.Events.OnMouseDown;
        canvas.onmouseup = Vis.WebGL.Canvas.Events.OnMouseUp;
        canvas.onmouseout = Vis.WebGL.Canvas.Events.OnMouseOut;
    },
    //******************************************************************************************
    //* @PRIVATE:   Sets up the layout. 
    //******************************************************************************************
    SetupLayout : function() {
        var canvas = this.Get();
        //set the size of the control
        canvas.width = this.Width;
        canvas.height = this.Height;

        //set the position to absolute;
        canvas.absolutize();

        //now store the relative values
        this.Left = canvas.getLayout().get('left');
        this.Top = canvas.getLayout().get('top');
    },
    //******************************************************************************************
    //* @PUBLIC: Takes absolute page coordinates and returns localized coordinates
    //******************************************************************************************
    GetLocalizedPosition : function(x, y) {
        var coords = {
            x : 0,
            y : 0
        };

        if (x >= this.Left && x <= (this.Left + this.Width) && y >= this.Top && y <= (this.Top + this.Height)) {
            coords.x = (x - this.Left) / this.Width * 2 - 1;
            coords.y = 1 - (y - this.Top) / this.Height * 2;
        }

        return coords;
    }
};

//******************************************************************************************
//* Event handling for the canvas object
//******************************************************************************************
Vis.WebGL.Canvas.Events = {
    _pressed    : false,
    _minY       : 560,      //minimum y which has to be reached
    //******************************************************************************************
    //* Mouse button has been pressed
    //******************************************************************************************
    OnMouseDown : function(e) {
        if (e.clientY < Vis.WebGL.Canvas.Events._minY)
            return;

        this._pressed = true;
        Vis.HideErrorScreen();

        //unselect all items except the one selected ;)
        var lc = Vis.WebGL.Canvas.GetLocalizedPosition(e.clientX, e.clientY);
        if (Vis.Timeline) {
            var index = Vis.Timeline.GetItemIndexBy(lc.x);
            Vis.Timeline.ShowRearrangeView();

            Vis.Timeline.SetDaterange(!e.shiftKey, index);
            Vis.Timeline.Draw();
        }
    },
    //******************************************************************************************
    //* Mouse is moved
    //******************************************************************************************
    OnMouseMove : function(e) {
        if (e.clientY < Vis.WebGL.Canvas.Events._minY)
            return;

        if (Vis.Timeline) {
            var lc = Vis.WebGL.Canvas.GetLocalizedPosition(e.clientX, e.clientY);
            var index = Vis.Timeline.GetItemIndexBy(lc.x);
            Vis.Timeline.UpdateStatusLabel(index);
        }
    },
    //******************************************************************************************
    //* Mouse button has been released
    //******************************************************************************************
    OnMouseUp : function(e) {
        if (e.clientY < Vis.WebGL.Canvas.Events._minY)
            return;
        this._pressed = false;
    },
    //******************************************************************************************
    //* Mouse is moved outside the control
    //******************************************************************************************
    OnMouseOut : function(e) {
        if (this._pressed)
            this._pressed = false;
    }
};

//******************************************************************************************
//* Contains the WebGL scene
//******************************************************************************************
Vis.WebGL.Scene = {
    //******************************************************************************************
    //* @PUBLIC: Draws the scene
    //******************************************************************************************
    Draw : function() {
        if (Vis.Drawing) {
            Vis.Drawing.Draw();
        }
        if (Vis.Timeline) {
            Vis.Timeline.Draw();
        }
	},
};

//******************************************************************************************
//* WebGL Shaders
//******************************************************************************************
Vis.WebGL.Shaders = {
    BasicShader : null,     //Basic shader program
    TimelineShader : null,  //Timeline shader program
    //******************************************************************************************
    //* Initializes the shaders
    //******************************************************************************************
    Init : function() {
        var gl = Vis.WebGL.Context;
        //init basic shader
        var fragmentShader = Vis.WebGL.Shaders.GetShader("basic-shader-fs");
        var vertexShader = Vis.WebGL.Shaders.GetShader("basic-shader-vs");

        this.BasicShader = gl.createProgram();
        var shaderProgram = this.BasicShader;
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert("Could not initialise shaders (basic)");
            return;
        }

        //init timeline shader
        var fragmentShader = Vis.WebGL.Shaders.GetShader("tl-shader-fs");
        var vertexShader = Vis.WebGL.Shaders.GetShader("tl-shader-vs");

        this.TimelineShader = gl.createProgram();
        var shaderProgram = this.TimelineShader;
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert("Could not initialise shaders (timeline)");
            return;
        }
    },
    //******************************************************************************************
    //* @PUBLIC: Gets the shader specified by id
    //* @RETURN: returns the shader
    //******************************************************************************************
    GetShader : function(id) {
        if (Vis.WebGL.Context == null) {
            alert("Context not available!");
            return;
        }

        var shaderScript = $(id);
        if (!shaderScript) {
            return null;
        }

        var str = "";
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3) {
                str += k.textContent;
            }
            k = k.nextSibling;
        }

        var shader;
        if (shaderScript.type == "x-shader/x-fragment") {
            shader = Vis.WebGL.Context.createShader(Vis.WebGL.Context.FRAGMENT_SHADER);
        } else if (shaderScript.type == "x-shader/x-vertex") {
            shader = Vis.WebGL.Context.createShader(Vis.WebGL.Context.VERTEX_SHADER);
        } else {
            return null;
        }

        Vis.WebGL.Context.shaderSource(shader, str);
        Vis.WebGL.Context.compileShader(shader);

        if (!Vis.WebGL.Context.getShaderParameter(shader, Vis.WebGL.Context.COMPILE_STATUS)) {
            alert(Vis.WebGL.Context.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }
};

