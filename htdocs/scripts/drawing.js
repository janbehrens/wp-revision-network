//******************************************************************************************
//* Represents the drawing that shows conflicting authors on an ellipsis
//******************************************************************************************
Vis.Drawing = {
    positions   : null,   //array of authors and their positions
	s           : null,   //the network's skewness
	rsdmin      : null,
	rsdmax      : null,
	scale       : null,   //scale factor
    Width       : 2,      // width (local coords)
    Height      : 2,      // height (local coords)
    LegendWidth : 0.3,      // legend width (local coords)
    //******************************************************************************************
    //* @PUBLIC: Initializes the drawing
    //******************************************************************************************
    Init : function(positions, s, rsdmin, rsdmax) {
        this.positions = positions;
        this.s = s;
        this.rsdmin = rsdmin;
        this.rsdmax = rsdmax;
        this.scale = 0.8;  //scaling factor - does it need more magic to make the drawing always fit in the screen?
        if (Vis.Timeline) {
            this.Height = 2 - Vis.Timeline.Height;
        }
        this.Width = 2 - this.LegendWidth;
    },
    //******************************************************************************************
    //* Draws an ellipsis
    //******************************************************************************************
    DrawEllipsis : function(center, scale, ratio, n, color, linestrip) {
        var gl = Vis.WebGL.Context;

		var vertices = [center.x, center.y];
		var unpackedColors = color;
		var triangleVertices = [];
		var lineVertices = [];
		
		for (var j = 0; j < n; j++) {
		    vertices = vertices.concat([
		        center.x + scale * Math.cos(j * 2*Math.PI/n),
		        center.y + ratio * scale * Math.sin(j * 2*Math.PI/n)
		    ]);
		    unpackedColors = unpackedColors.concat(color);
		    triangleVertices = triangleVertices.concat([0, j+1, (j+1<n?j+2:1)]);
		    lineVertices = lineVertices.concat([j+1, j+1, (j+1<n?j+2:1)]);
		}

	    var Ellipsis = gl.createBuffer();
	    gl.bindBuffer(gl.ARRAY_BUFFER, Ellipsis);
	    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	    gl.vertexAttribPointer(Vis.WebGL.Shaders.BasicShader.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
	    
	    var EllipsisColor = gl.createBuffer();
	    gl.bindBuffer(gl.ARRAY_BUFFER, EllipsisColor);
	    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.STATIC_DRAW);
	    gl.vertexAttribPointer(Vis.WebGL.Shaders.BasicShader.vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

		if (linestrip) {
		    var EllipsisIndex = gl.createBuffer();
		    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, EllipsisIndex);
		    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(lineVertices), gl.STATIC_DRAW);
		    EllipsisIndex.numItems = triangleVertices.length;
		
		    gl.drawElements(gl.LINE_LOOP, EllipsisIndex.numItems, gl.UNSIGNED_SHORT, 0);
		}
		else {
		    var EllipsisIndex = gl.createBuffer();
		    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, EllipsisIndex);
		    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangleVertices), gl.STATIC_DRAW);
		    EllipsisIndex.numItems = triangleVertices.length;
		
		    gl.drawElements(gl.TRIANGLES, EllipsisIndex.numItems, gl.UNSIGNED_SHORT, 0);
		}
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
        xOffset = xOffset < 0.001 ? 0.001 : xOffset;
        xOffset = xOffset > 0.1 ? 0.1 : xOffset;
        yOffset = yOffset < 0.001 ? 0.001 : yOffset;
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
    DrawText : function(localpos, xyOffset, xyExtent, placement, text, color, size) {
        var textdiv = document.createElement('div');
        textdiv.setAttribute('class', 'dtext');
        textdiv.setAttribute('id', 'text_' + text);
        
        var width = text.length * 8;    //could be determined from the font size as well...
        var height = 18;
        var left = Vis.WebGL.Canvas.Left + Vis.WebGL.Canvas.Width * xyOffset.x/2 + xyExtent.x/2 * Vis.WebGL.Canvas.Width/2 * (1 + localpos.x) - width/2;
        var top = Vis.WebGL.Canvas.Top + Vis.WebGL.Canvas.Height * xyOffset.y/2 + xyExtent.y/2 * Vis.WebGL.Canvas.Height/2 * (1 - localpos.y) - height/2;
        
        if (placement) { left += localpos.x < 0 ? -width/2 : width/2; }
        if (placement) { top -= localpos.y < 0 ? -height/2 : height/2; }
        
        textdiv.style.position = "absolute";
        textdiv.style.width = width + 'px';
        textdiv.style.height = height + 'px';
        textdiv.style.left = left + 'px';
        textdiv.style.top = top + 'px';
        textdiv.style.fontSize = size ? size : '120%';
        textdiv.style.color = this.ColorToHex(color);
        
        textdiv.innerHTML = text;
        
        document.body.appendChild(textdiv);
    },
    ColorToHex : function(color) {
        hex = [];
        for (var i = 0; i < 3; i++) {
            hex[i] = Math.floor(color[i]*255).toString(16);
            if (hex[i].length == 1) { hex[i] = '0' + hex[i]; }
        }
        return '#' + hex[0] + hex[1] + hex[2];
    },
    //******************************************************************************************
    //* Clears text
    //******************************************************************************************
    ClearText : function() {
        $$('div.dtext').each(function(item) {
            item.remove();
        });
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
        var offset = {x: 0, y: 0};
        var extent = {x: this.Width, y: this.Height};
                
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
                
                //define the color (based on steadiness of participation)
                var rsd = this.positions[i].rsd;
                var brightness = (rsd - this.rsdmin) / (this.rsdmax - this.rsdmin + 0.001);
		        
		        //save author information - but not the invisibly small ones
		        if (a > 0.01) {
                    this.positions[i].render = true;
                    this.positions[i].xy = {x: x, y: y};
                    this.positions[i].a = a;
                    this.positions[i].ratio = ratio;
                    this.positions[i].inv = inv;
                    this.positions[i].brightness = brightness;
                }
            }
		}
        //filter out overlapping authors, keep the ones with highest involvement.
		for (var i = 0; i < this.positions.length - 1; i++) {
		    var cur = this.positions[i];
		    if (cur.render && cur.render == true) {
                for (var j = i+1; j < this.positions.length; j++) {
                    var other = this.positions[j];
                    if (other.render && other.render == true) {
                        var distance = Math.sqrt(Math.pow(other.xy.x - cur.xy.x, 2) + Math.pow(other.xy.y - cur.xy.y, 2));
                        if (distance < 0.1) {          //distance threshold goes here
                            if (cur.inv > other.inv) {
                                other.render = false;
                            }
                            else {
                                cur.render = false;
                            }
                        }
                    }
                }
            }
        }
		//draw authors
		for (var i = 0; i < this.positions.length; i++) {
		    var cur = this.positions[i];
		    if (cur.render && cur.render == true) {
                this.DrawEllipsis(cur.xy, cur.a, cur.ratio, 24, [0.0, cur.brightness, cur.brightness/2, 1.0]);
                var red = cur.brightness < 0.7 ? 0.9 : 0.45;
                var green = cur.brightness < 0.7 ? 0.8-cur.brightness/8 : 0.4-cur.brightness/8;
                var blue = 0;
                this.DrawText(cur.xy, offset, extent, cur.a < 0.05, cur.name, [red, green, blue]);
            }
		}
    },
    //******************************************************************************************
    //* Draws the revision edges
    //******************************************************************************************
    DrawRevisionEdges : function() {
        var origin, destination, weight;
        for (var i = 0; i < this.positions.length; i++) {
            origin = this.positions[i];
            if (origin.render && origin.render == true) {
                for (var target in origin.revised) {
                    for (var j = 0; j < this.positions.length; j++) {
                        destination = this.positions[j];
                        if (destination.name == target && destination.render && destination.render == true) {
                            weight = origin.revised[target];
                            if (destination.revised.hasOwnProperty(origin.name)) {
                                weight -= destination.revised[origin.name];
                            }
                            if (weight >= 0) {
                                this.DrawEdge(origin.xy, destination.xy, weight);
                            }
                            else {
                                this.DrawEdge(destination.xy, origin.xy, weight);
                            }
                            break;
                        }
                    }
                }
            }
        }
    },
    //******************************************************************************************
    //* Draws the legend
    //******************************************************************************************
    DrawLegend : function() {
        var scaleFactor = 1.8*this.LegendWidth/this.Height;     //should produce a circle
        var offset = {x: this.Width, y: 0};
        var extent = {x: this.LegendWidth, y: this.Height};
        
        this.DrawText({x: 0, y: 0.95}, offset, extent, false, "author characteristics", [0,0,0], '100%');
        //involvement
        this.DrawText({x: 0.5, y: 0.85}, offset, extent, false, "involvement in controversy", [0,0,0], '90%');
        this.DrawEllipsis({x: -0.4, y: 0.7}, 0.36, scaleFactor, 24, [0.5,0.5,0.5,1], true);
        this.DrawEllipsis({x: 0.5, y: 0.7}, 0.12, scaleFactor, 24, [0.5,0.5,0.5,1], true);
        this.DrawText({x: -0.3, y: 0.55}, offset, extent, false, "very much", [0,0,0], '90%');
        this.DrawText({x: 0.6, y: 0.55}, offset, extent, false, "not much", [0,0,0], '90%');
        //revisor vs. being revised
        this.DrawText({x: 0.5, y: 0.45}, offset, extent, false, "revisor  vs.  being revised", [0,0,0], '90%');
        this.DrawEllipsis({x: -0.6, y: 0.25}, 0.23, 2*scaleFactor, 24, [0.5,0.5,0.5,1], true);
        this.DrawEllipsis({x: 0.4, y: 0.25}, 0.46, 0.5*scaleFactor, 24, [0.5,0.5,0.5,1], true);
        //revision edges
        this.DrawText({x: -0.4, y: 0}, offset, extent, false, "A revises B", [0,0,0], '90%');
        this.DrawEllipsis({x: -0.6, y: -0.1}, 0.2, scaleFactor, 24, [0.5,0.5,0.5,1], true);
        this.DrawEllipsis({x: 0.4, y: -0.1}, 0.2, scaleFactor, 24, [0.5,0.5,0.5,1], true);
        this.DrawEdge({x: -0.6, y: -0.1}, {x: 0.4, y: -0.1}, 1.5);
        this.DrawText({x: 0.4, y: -0.3}, offset, extent, false, "A and B revise each other", [0,0,0], '90%');
        this.DrawEllipsis({x: -0.6, y: -0.4}, 0.2, scaleFactor, 24, [0.5,0.5,0.5,1], true);
        this.DrawEllipsis({x: 0.4, y: -0.4}, 0.2, scaleFactor, 24, [0.5,0.5,0.5,1], true);
        this.DrawEdge({x: -0.6, y: -0.4}, {x: 0.4, y: -0.4}, 0.5);
        //variance
        this.DrawText({x: 0.45, y: -0.6}, offset, extent, false, "variance in edit frequency", [0,0,0], '90%');
        this.DrawEllipsis({x: -0.65, y: -0.75}, 0.25, scaleFactor, 24, [0,1,0.5,1]);
        this.DrawEllipsis({x: 0, y: -0.75}, 0.25, scaleFactor, 24, [0,0.5,0.25,1]);
        this.DrawEllipsis({x: 0.65, y: -0.75}, 0.25, scaleFactor, 24, [0,0,0,1]);
        this.DrawText({x: -0.6, y: -0.9}, offset, extent, false, "high", [0,0,0], '90%');
        this.DrawText({x: 0.1, y: -0.9}, offset, extent, false, "middle", [0,0,0], '90%');
        this.DrawText({x: 0.7, y: -0.9}, offset, extent, false, "low", [0,0,0], '90%');
    },
    //******************************************************************************************
    //* Draws the drawing
    //******************************************************************************************
    Draw : function() {
        var gl = Vis.WebGL.Context;
        var absWidth = gl.viewportWidth * this.Width/2;
        var absHeight = gl.viewportHeight * this.Height/2;
        var xOffset = 0;
        var yOffset = gl.viewportHeight * (1 - this.Height/2);
        
        gl.viewport(xOffset, yOffset, absWidth, absHeight);
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
        
        absWidth = gl.viewportWidth * this.LegendWidth/2;
        xOffset = gl.viewportWidth * (1 - this.LegendWidth/2);
        
        gl.viewport(xOffset, yOffset, absWidth, absHeight);
        
        this.DrawLegend();
    }
};
