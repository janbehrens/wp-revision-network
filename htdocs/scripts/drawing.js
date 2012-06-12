//******************************************************************************************
//* Represents the drawing that shows conflicting authors on an ellipsis
//******************************************************************************************
Vis.Drawing = {
    positions   : null,   //array of authors and their positions
	s           : null,   //the network's skewness
	scale       : null,   //scale factor
    Width       : 2,      // width (local coords)
    Height      : 2,      // height (local coords)
    AuthorsXY   : Object(),  //storage for (local) author coordinates
    //******************************************************************************************
    //* @PUBLIC: Initializes the drawing
    //******************************************************************************************
    Init : function(positions, s) {
        this.positions = positions;
        this.s = s;
        this.scale = 0.8;  //scaling factor - does it need more magic to make the drawing always fit in the screen?
        if (Vis.Timeline) {
            this.Height = 2 - Vis.Timeline.Height;
        }
    },
    //******************************************************************************************
    //* Draws an ellipsis
    //******************************************************************************************
    DrawEllipsis : function(center, scale, ratio, n, color) {
        var gl = Vis.WebGL.Context;

		var vertices = [center.x, center.y];
		var unpackedColors = color;
		var triangleVertices = [];
		
		for (var j = 0; j < n; j++) {
		    vertices = vertices.concat([
		        center.x + scale * Math.cos(j * 2*Math.PI/n),
		        center.y + ratio * scale * Math.sin(j * 2*Math.PI/n)
		    ]);
		    unpackedColors = unpackedColors.concat(color);
		    triangleVertices = triangleVertices.concat([0, j+1, (j+1<n?j+2:1)]);
		}

		var Ellipsis = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, Ellipsis);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		gl.vertexAttribPointer(Vis.WebGL.Shaders.BasicShader.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
 
		var EllipsisColor = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, EllipsisColor);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.STATIC_DRAW);
		gl.vertexAttribPointer(Vis.WebGL.Shaders.BasicShader.vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

		var EllipsisIndex = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, EllipsisIndex);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangleVertices), gl.STATIC_DRAW);
		EllipsisIndex.numItems = triangleVertices.length;

		gl.drawElements(gl.TRIANGLE_FAN, EllipsisIndex.numItems, gl.UNSIGNED_SHORT, 0);
    },
    //******************************************************************************************
    //* Draws a revision edge
    //******************************************************************************************
    DrawEdge : function(from, to, weight) {
        var gl = Vis.WebGL.Context;
        
        //in order to get the polygon vertices, whose positions depend on the authors' positions
        //as well as edge thickness, find a vector orthogonal to the edge, normalize it, and 
        //multiply by weight
		var xOrtho = -(to.y - from.y);
        var yOrtho = (to.x - from.x);
        var len = Math.sqrt(Math.pow(xOrtho, 2) + Math.pow(yOrtho, 2));
        var xOffset = 0.01 * weight * xOrtho/len;
        var yOffset = 0.01 * weight * yOrtho/len/this.s;
        
        //then limit the width
        xOffset = xOffset < 0.005 ? 0 : xOffset;
        xOffset = xOffset > 0.1 ? 0.1 : xOffset;
        yOffset = yOffset < 0.005 ? 0 : yOffset;
        yOffset = yOffset > 0.1 ? 0.1 : yOffset;
        
		var vertices = [
		    from.x - xOffset, from.y - yOffset,
		    from.x + xOffset, from.y + yOffset,
		    to.x - xOffset, to.y - yOffset,
		    to.x + xOffset, to.y + yOffset ];
		
        var squareVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.vertexAttribPointer(Vis.WebGL.Shaders.BasicShader.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
        
        //define the color scale, again depending on the weight
		var lightgrey = 0.5 + 0.4*weight;       //this is arbitrary, normalized weights would be better....
		lightgrey = lightgrey > 1 ? 1 : lightgrey;
		
		var colors = [
		    1-lightgrey, 1-lightgrey, 1-lightgrey, 1.0,
		    1-lightgrey, 1-lightgrey, 1-lightgrey, 1.0,
		    lightgrey, lightgrey, lightgrey, 1.0,
		    lightgrey, lightgrey, lightgrey, 1.0 ];

        var squareVertexColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        gl.vertexAttribPointer(Vis.WebGL.Shaders.BasicShader.vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    //******************************************************************************************
    //* Draws text (using DIVs)
    //******************************************************************************************
    DrawText : function(localpos, text) {
        var textdiv = document.createElement('div');
        textdiv.setAttribute('id', 'text_' + text);
        
        var width = text.length * 7;    //could be determined from the font size as well...
        var height = 15;
        var xExtent = 1;
        var yExtent = this.Height/2;
        var left = Vis.WebGL.Canvas.Left + xExtent * Vis.WebGL.Canvas.Width/2 * (1 + localpos.x) - width/2;
        var top = Vis.WebGL.Canvas.Top + yExtent * Vis.WebGL.Canvas.Height/2 * (1 + localpos.y) - height/2;
        
        textdiv.style.position = "absolute";
        textdiv.style.width = width + 'px';
        textdiv.style.height = height + 'px';
        textdiv.style.left = left + 'px';
        textdiv.style.top = top + 'px';
        
        textdiv.innerHTML = text;
        
        document.body.appendChild(textdiv);
    },
    //******************************************************************************************
    //* Clears text
    //******************************************************************************************
    ClearText : function() {
        var divs = document.getElementsByTagName("div");
        for (var n = 0; n < 10; n++) {      //strange, but works better
            for (var i = 0; i < divs.length; i++) {
                if (divs[i].id.indexOf('text_') == 0) {
                    document.body.removeChild(divs[i]);
                }
            }
        }
    },
    //******************************************************************************************
    //* Draws the main ellipsis
    //******************************************************************************************
    DrawMainEllipsis : function() {
        this.DrawEllipsis({x: 0, y: 0}, this.scale, this.s, 48, [1.0, 1.0, 1.0, 1.0]);
    },
    //******************************************************************************************
    //* Draws the authors as ellipses
    //******************************************************************************************
    DrawAuthors : function() {
		var inv, x, y, ratio, a;
                
		for (var i=0; i<this.positions.length; i++) {
		    if ((inv = Math.sqrt(Math.pow(this.positions[i].p1, 2) + Math.pow(this.positions[i].p2, 2))) != 0) {
		        x = this.scale * this.positions[i].p1 / inv;
                y = this.s * this.scale * this.positions[i].p2 / inv;
		        
		        ratio = this.positions[i].out / (this.positions[i].in + 0.001);    //just to make sure we don't divide by zero
		        ratio = ratio < 0.333 ? 0.333 : ratio;  //limit the ratio
		        ratio = ratio > 3 ? 3 : ratio;
		        
		        /*  ratio = b / a
		            inv ~ PI * a * b
		            =>  inv ~ PI * a * a * ratio

		            =>  (PI*a*a*ratio) / inv = const.
		            =>  a² = const. * inv / (PI * ratio)    */

		        a = Math.sqrt(0.05 * inv / (Math.PI * ratio));  //the constant defines the average size of
		                                                        //the authors' ellipses
                
		        //draw ellipses - but not the invisibly small ones
		        if (a > 1e-3) {
                    this.DrawEllipsis({x: x, y: y}, a, ratio, 24, [0.0, 0.8, 0.4, 1.0]);
                    this.DrawText({x: x, y: y}, this.positions[i].name);
                    //store XY
                    this.AuthorsXY[this.positions[i].name] = {x: x, y: y};
                }
            }
		}
    },
    //******************************************************************************************
    //* Draws the revision edges
    //******************************************************************************************
    DrawRevisionEdges : function() {
        for (var i=0; i<this.positions.length; i++) {
            if (this.AuthorsXY[this.positions[i].name]) {
                var from = this.AuthorsXY[this.positions[i].name];
                
                for (var target in this.positions[i].revised) {
                    if (this.AuthorsXY[target]) {
                        //alert(this.positions[i].name+", "+target);
                        this.DrawEdge(
                            from,
                            this.AuthorsXY[target],
                            this.positions[i].revised[target]
                        );
                    }
                }
            }
        }
    },
    //******************************************************************************************
    //* Draws the drawing
    //******************************************************************************************
    Draw : function() {
        var gl = Vis.WebGL.Context;
        var absHeight = gl.viewportHeight * this.Height/2;
        var offset = gl.viewportHeight * (1 - this.Height/2)
        
        gl.viewport(0, offset, gl.viewportWidth, absHeight);
        gl.clear(gl.COLOR_BUFFER_BIT);

        var shaderProgram = Vis.WebGL.Shaders.BasicShader;
        gl.useProgram(shaderProgram);

        shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
        gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

		shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
		gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
		
        this.ClearText();
        this.DrawAuthors();
        this.DrawRevisionEdges();
        this.DrawMainEllipsis();
    }
};
