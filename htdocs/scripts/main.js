//******************************************************************************************
//* Main visualization namespace
//******************************************************************************************
Vis = {
};

//******************************************************************************************
//* WebGL stuff
//******************************************************************************************
Vis.WebGL = {
    Context : null,     //contains the WebGL context
    //******************************************************************************************
    //* @PUBLIC: Initializes the WebGL stuff
    //******************************************************************************************
    Init : function(w) {
        if (!Vis.WebGL.CreateContext($('vis-canvas'))) {
            alert("Could not initialise WebGL!");
            return;
        }
        Vis.WebGL.Shaders.Init();
        Vis.WebGL.Buffers.Init();

        Vis.WebGL.Context.clearColor(0.0, 0.0, 0.0, 1.0);
        Vis.WebGL.Context.enable(Vis.WebGL.Context.DEPTH_TEST);

        Vis.WebGL.Scene.Draw(w);
    },
    //******************************************************************************************
    //* @PRIVATE:   Create the WebGL context
    //* @RETURN:    [bool] true if WebGL context has been created
    //******************************************************************************************
    CreateContext : function(canvas) {
        try {
            Vis.WebGL.Context = canvas.getContext("experimental-webgl");
            Vis.WebGL.Context.viewportWidth = canvas.width;
            Vis.WebGL.Context.viewportHeight = canvas.height;
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
//* Contains the WebGL scene
//******************************************************************************************
Vis.WebGL.Scene = {
    ModelViewMatrix : mat4.create(),
    ProjectionMatrix : mat4.create(),
    //******************************************************************************************
    //* @PUBLIC: Draws the scene
    //******************************************************************************************
    Draw : function(w) {
        var gl = Vis.WebGL.Context;
		var n = 48;
		var twoPi = 2.0 * 3.14159;

        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, this.ProjectionMatrix);
        mat4.identity(this.ModelViewMatrix);

		//draw the ellipsis
		mat4.translate(this.ModelViewMatrix, [0.0, 0.0, -4.0]);
		gl.bindBuffer(gl.ARRAY_BUFFER, Vis.WebGL.Buffers.Ellipsis);
		gl.vertexAttribPointer(Vis.WebGL.Shaders.BasicShader.vertexPositionAttribute, Vis.WebGL.Buffers.Ellipsis.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, Vis.WebGL.Buffers.EllipsisColor);
		gl.vertexAttribPointer(Vis.WebGL.Shaders.BasicShader.vertexColorAttribute, Vis.WebGL.Buffers.EllipsisColor.itemSize, gl.FLOAT, false, 0, 0);
		this.SetMatrixUniforms(Vis.WebGL.Shaders.BasicShader);
		gl.drawElements(gl.TRIANGLES, Vis.WebGL.Buffers.EllipsisIndex.numItems, gl.UNSIGNED_SHORT, 0);

		//draw user
		var j = w * n/2;  //do something with the parameter passed from PHP (dummy)
		mat4.translate(this.ModelViewMatrix, [1.3*Math.cos((j-1) * twoPi / n), Math.sin((j-1) * twoPi / n), 0.0]); //using the ellipsis' vertex positions as viewpoint. j should depend on the author's position (currently just a dummy).
		mat4.translate(this.ModelViewMatrix, [0.0, 0.0, 0.000001]);   //bring it to foreground
		gl.bindBuffer(gl.ARRAY_BUFFER, Vis.WebGL.Buffers.User);
		gl.vertexAttribPointer(Vis.WebGL.Shaders.BasicShader.vertexPositionAttribute, Vis.WebGL.Buffers.User.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, Vis.WebGL.Buffers.UserColor);
		gl.vertexAttribPointer(Vis.WebGL.Shaders.BasicShader.vertexColorAttribute, Vis.WebGL.Buffers.UserColor.itemSize, gl.FLOAT, false, 0, 0);
		this.SetMatrixUniforms(Vis.WebGL.Shaders.BasicShader);
		gl.drawElements(gl.TRIANGLES, Vis.WebGL.Buffers.UserIndex.numItems, gl.UNSIGNED_SHORT, 0);
	},
    //******************************************************************************************
    //* @PRIVATE: Sets the matrix uniforms for the given shader program
    //* @PARAM: [shader] the shader program
    //******************************************************************************************
    SetMatrixUniforms : function(shaderProgram) {
        Vis.WebGL.Context.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, this.ProjectionMatrix);
        Vis.WebGL.Context.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, this.ModelViewMatrix);
    }
};

//******************************************************************************************
//* WebGL Shaders
//******************************************************************************************
Vis.WebGL.Shaders = {
    BasicShader : null,     //Basic shader program
    //******************************************************************************************
    //* Initializes the shaders
    //******************************************************************************************
    Init : function() {
        var gl = Vis.WebGL.Context;
        var fragmentShader = Vis.WebGL.Shaders.GetShader("basic-shader-fs");
        var vertexShader = Vis.WebGL.Shaders.GetShader("basic-shader-vs");

        this.BasicShader = gl.createProgram();
        var shaderProgram = this.BasicShader;
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert("Could not initialise shaders");
            return;
        }

        gl.useProgram(shaderProgram);

        shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
        gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

		shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
		gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

        shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
        shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
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

//******************************************************************************************
//* WebGL Buffers
//******************************************************************************************
Vis.WebGL.Buffers = {
    Ellipsis : null,
	EllipsisColor : null,
	EllipsisIndex : null,
    User : null,
	UserColor : null,
	UserIndex : null,
    //******************************************************************************************
    //* Initializes the buffers
    //******************************************************************************************
    Init : function() {
        var gl = Vis.WebGL.Context;
		var n = 48;
		var twoPi = 2.0 * 3.14159;

		//Ellipsis
		vertices = [0, 0, 0];
		var normalData = [0, 0, 1];
		var unpackedColors = [1, 0, 0, 1];
		var cubeVertexIndices = [];

		for (var j = 0; j < n; j++) {
		    vertices = vertices.concat([1.3*Math.cos((j-1) * twoPi / n), Math.sin((j-1) * twoPi / n), 0.0]);
		    normalData = normalData.concat([0, 0, 1]);
		    unpackedColors = unpackedColors.concat([1.0, 0.0, 0.0, 1.0]);
		    cubeVertexIndices = cubeVertexIndices.concat([0,j+1,(j+1<n?j+2:1)]);
		}

		Vis.WebGL.Buffers.Ellipsis = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, Vis.WebGL.Buffers.Ellipsis);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		Vis.WebGL.Buffers.Ellipsis.itemSize = 3;
		Vis.WebGL.Buffers.Ellipsis.numItems = vertices.length / Vis.WebGL.Buffers.Ellipsis.itemSize;
 
		Vis.WebGL.Buffers.EllipsisColor = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, Vis.WebGL.Buffers.EllipsisColor);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.STATIC_DRAW);
		Vis.WebGL.Buffers.EllipsisColor.itemSize = 4;
		Vis.WebGL.Buffers.EllipsisColor.numItems = unpackedColors.length / Vis.WebGL.Buffers.EllipsisColor.itemSize;

		Vis.WebGL.Buffers.EllipsisIndex = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Vis.WebGL.Buffers.EllipsisIndex);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
		Vis.WebGL.Buffers.EllipsisIndex.itemSize = 1;
		Vis.WebGL.Buffers.EllipsisIndex.numItems = cubeVertexIndices.length / Vis.WebGL.Buffers.EllipsisIndex.itemSize;

		//User (another ellipsis actually)
		vertices = [0, 0, 0];
		normalData = [0, 0, 1];
		unpackedColors = [0.0, 1.0, 0.4, 1.0];
		cubeVertexIndices = [];

		for (var j = 0; j < n; j++) {
		    vertices = vertices.concat([0.8*0.1*Math.cos((j-1) * twoPi / n), 0.1*Math.sin((j-1) * twoPi / n), 0.0]);
		    normalData = normalData.concat([0, 0, 1]);
		    unpackedColors = unpackedColors.concat([0.0, 1.0, 0.4, 1.0]);
		    cubeVertexIndices = cubeVertexIndices.concat([0,j+1,(j+1<n?j+2:1)]);
		}

		Vis.WebGL.Buffers.User = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, Vis.WebGL.Buffers.User);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		Vis.WebGL.Buffers.User.itemSize = 3;
		Vis.WebGL.Buffers.User.numItems = vertices.length / Vis.WebGL.Buffers.User.itemSize;
 
		Vis.WebGL.Buffers.UserColor = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, Vis.WebGL.Buffers.UserColor);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.STATIC_DRAW);
		Vis.WebGL.Buffers.UserColor.itemSize = 4;
		Vis.WebGL.Buffers.UserColor.numItems = unpackedColors.length / Vis.WebGL.Buffers.UserColor.itemSize;

		Vis.WebGL.Buffers.UserIndex = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Vis.WebGL.Buffers.UserIndex);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
		Vis.WebGL.Buffers.UserIndex.itemSize = 1;
		Vis.WebGL.Buffers.UserIndex.numItems = cubeVertexIndices.length / Vis.WebGL.Buffers.UserIndex.itemSize;
	}
};
