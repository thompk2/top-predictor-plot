var format = d3.format(",d"),
    root,
    segments = [],
    _segments = [],
    xAxisSelect,
    yAxisSelect,
    _xDomain,
    _yDomain,
    hbar,
    vbar,
    dbar,
    brushCell,
    topObject = {},
    padding = 5, // separation between nodes
    rad = 10;

var margin = {top: 20, right: 20, bottom: 30, left: 40},
    width = 1000 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

// setup x 
var xValue = function(d) { return d.Frequency;}, // data -> value
    xScale = d3.scale.pow().exponent(.4).range([width, 0]), // value -> display
    xMap = function(d) { return xScale(xValue(d));}, // data -> display
    xAxis = d3.svg.axis().scale(xScale).orient("bottom");

// setup y
var yValue = function(d) { return d.Lift;}, // data -> value
    yScale = d3.scale.linear().range([height, 0]), // value -> display
    yMap = function(d) { return yScale(yValue(d));}, // data -> display
    yAxis = d3.svg.axis().scale(yScale).orient("left");

// setup r
var rValue = function(d) { return d.Importance; },
    rScale = d3.scale.linear().range([rad, rad]),
    rMap = function(d) { return rScale(rValue(d)); };

// setup fill color
var cValue = function(d) { return d.parent.parent.Name; },
    color = d3.scale.ordinal().range(colorbrewer.Set2[7]);;

// setup brush
var brush = d3.svg.brush()
    .x(xScale)
    .y(yScale)
    .on("brushstart", brushStart)
    .on("brush", brushMove)
    .on("brushend", brushEnd);

var radius = d3.scale.sqrt()
    .range([10, 60]);

// add the graph canvas to the body of the webpage
var svg = d3.select(".svg").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

svg.append("g")
    .attr("class", "brush")
    .call(brush)

var containter = svg.append("g");
var linkGroup = containter.append("g");
var nodeGroup = containter.append("g");
var link = linkGroup.selectAll(".link");
var node = nodeGroup.selectAll(".node");

var fullTree = d3.layout.tree()
    .children(function(d) {
        if(d.Categories) {
            return d.Categories;
        }
        if(d.Features) {
            return d.Features;
        }
        if(d.Segments) {
            return d.Segments;
        }
        else return null;
    });

// add the tooltip area to the webpage
var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

d3.json("McAfeeDataImportance.json", function(error, json) {
    root = json;
    var nodes = fullTree.nodes(root);
    _segments = segments = nodes.filter(function (d) {
       return d.depth === 3; 
    });
    
    _segments.sort(function(a, b) {
       return  b.Frequency - a.Frequency;
    });
    
    _segments.splice(_segments.length/2, segments.length);
        
  // x-axis
  xAxisSelect = svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)


  // y-axis
  yAxisSelect = svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)
    
  
  dbar = svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", height)
        .attr("y2", height)
        .classed("lift-line", true);
    
  hbar = svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", height)
        .attr("y2", height)
        .classed("lift-line", true);
    
  vbar = svg.append("line")
        .attr("x1", 0)
        .attr("x2", 0)
        .attr("y1", 0)
        .attr("y2", height)
        .classed("lift-line", true);
    
    update();
});

function update() {
    _xDomain = xScale.domain();
    _yDomain = yScale.domain();
    xScale.domain([d3.min(segments, xValue), d3.max(segments, xValue)]);
    yScale.domain([d3.min(segments, yValue), d3.max(segments, yValue)]);
    rScale.domain([d3.min(segments, rValue), d3.max(segments, rValue)]);

    var force = d3.layout.force()
        .nodes(segments, function(d) {
            return d.NodeID;  
        })
        .size([width, height])
        .on("tick", tick)
        .charge(-10)
        .gravity(0)
        .chargeDistance(1);
    
    //set initial positions
    segments.forEach(function(d) {
        d.x = xMap(d);
        d.y = yMap(d);
        d.radius = rMap(d);
    });
    
    dbar.transition().ease("cubic-in-out").duration(500)
        .attr("x1", xScale(d3.max(_segments, xValue)))
        .attr("y1", yScale(d3.min(_segments, yValue)))
        .attr("x2", xScale(d3.min(_segments, xValue)))
        .attr("y2", yScale(d3.max(_segments, yValue)));
    hbar.transition().ease("cubic-in-out").duration(500)
        .attr("y1",yScale(1))
        .attr("y2",yScale(1));
    
    vbar.transition().ease("cubic-in-out").duration(500)
        .attr("x1", xScale(d3.mean(_segments, xValue)))
        .attr("x2", xScale(d3.mean(_segments, xValue)));
    
    
  // draw dots
  var dot = svg.selectAll(".dot")
      .data(segments, function(d) {
        return d.NodeID;  
    })
  
    dot.enter().append("circle")
        .attr("r", 0)
        .attr("cx", 0)
        .attr("cy", height)
        .attr("class", "dot")
        .on("mouseover", function(d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html('<div class="name">' + d.Name + '</div>' + 
                         '<div class="feature">' + d.parent.Name + '</div>' +
                         '<div class="lift">Lift: ' + yValue(d) + '</div>' +
                         '<div class="freq">Freq: ' + xValue(d) + '</div>')
                .style("left", (d3.event.pageX + 5) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
    
    dot.transition().ease("cubic-in-out").duration(500)
        .attr("r", rMap)
        .attr("cx", xMap)
        .attr("cy", yMap)
        .style("fill", function(d) { 
            return color(cValue(d));
        })
    
    dot.exit().transition()
        .attr("cx", 0)
        .attr("cy", height)
        .remove();

    // draw legend
    var legend = svg.selectAll(".legend")
        .data(color.domain())
    var legendEnter = legend.enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; })
        .on("mouseover", function(d0) {
            svg.selectAll(".dot")
                .classed("diminish", function(d1) {
                        if (d1.parent.parent.Name === d0)
                            return false;
                   return true;
                });
        })
        .on("mouseleave", function(d) {
            svg.selectAll(".dot").classed("diminish", false);
        })

    // draw legend colored rectangles
    legendEnter.append("rect")
        .attr("x", width)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

    // draw legend text
    legendEnter.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d;})
    
    legend.exit().remove();
  
    axisTransition();
    force.start();
};

function tick(e) {
    var dot = svg.selectAll(".dot")
    dot.each(moveTowardDataPosition(e.alpha));
    dot.each(collide(e.alpha));
    dot.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })
};

function moveTowardDataPosition(alpha) {
    return function(d) {
        d.x += (xMap(d) - d.x) * 0.1 * alpha;
        d.y += (yMap(d) - d.y) * 0.1 * alpha;
    };
};

// Resolve collisions between nodes.
function collide(alpha) {
    var quadtree = d3.geom.quadtree(segments);
    return function(d) {
        var r = d.radius + rad + padding,
        nx1 = d.x - r,
        nx2 = d.x + r,
        ny1 = d.y - r,
        ny2 = d.y + r;
        quadtree.visit(function(quad, x1, y1, x2, y2) {
            if (quad.point && (quad.point !== d)) {
                var x = d.x - quad.point.x,
                    y = d.y - quad.point.y,
                    l = Math.sqrt(x * x + y * y),
                    r = d.radius + quad.point.radius + padding;
                if (l < r) {
                    l = (l - r) / l * alpha;
                    d.x -= x *= l;
                    d.y -= y *= l;
                    quad.point.x += x;
                    quad.point.y += y;
                }
            }
            return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
    };
}

function axisTransition() {
  xAxisSelect.transition().tween("axis", function(d, i) {
    var i = d3.interpolate(_xDomain, xScale.domain());
    return function(t) {
      xScale.domain(i(t));
      xAxisSelect.call(xAxis)
          .append("text")
    .attr("class", "label")
    .attr("x", width)
    .attr("y", -6)
    .style("text-anchor", "end");
    }
  });
    
  yAxisSelect.transition().tween("axis", function(d, i) {
    var i = d3.interpolate(_yDomain, yScale.domain());
    return function(t) {
      yScale.domain(i(t));
      yAxisSelect.call(yAxis)
          .append("text")
            .attr("class", "label")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end");

    }
  });
};

function brushStart(p){
    if (brushCell !== this) {
        d3.select(brushCell).call(brush.clear());
        brushCell = this;
    }
};

function brushMove(p) {

};

function brushEnd(p) {
    var extent = brush.extent();
    if (brush.empty()) {
        segments = _segments;   
    }
    else {
        segments = _segments.slice(0, _segments.length);
        segments = segments.filter(function(d) {
            return d.Frequency >= extent[0][0] && d.Frequency < extent[1][0] && d.Lift >= extent[0][1] && d.Lift < extent[1][1];
        });
        if(segments.length === 0){
            segments = _segments;    
        }
    }
    d3.select(brushCell).call(brush.clear());
    update();
};

$(".filter").click(function (e) {
    svg.selectAll(".dot")
        .classed("highlight", false);
    
    if ($(this).hasClass("lift-top-10")){
        filterSegments(10, "Lift");
    }
    if ($(this).hasClass( "lift-top-20"))
        filterSegments(20, "Lift");

    if ($(this).hasClass( "lift-bot-10"))
        filterSegments(10, "Lift", true);

    if ($(this).hasClass( "lift-bot-20"))
        filterSegments(20, "Lift", true);

    if ($(this).hasClass( "freq-10"))
        filterSegments(10, "Frequency");

    if ($(this).hasClass( "freq-20"))
        filterSegments(20, "Frequency");

    if ($(this).hasClass( "all"))
        segments = _segments;

    update();
});

$(".filter").on("mouseenter", function(e) {
    if (segments.length == _segments.length) {
        if ($(this).hasClass("lift-top-10")){
            highlightSegments(10, "Lift");
        }
        if ($(this).hasClass( "lift-top-20"))
            highlightSegments(20, "Lift");

        if ($(this).hasClass( "lift-bot-10"))
            highlightSegments(10, "Lift", true);

        if ($(this).hasClass( "lift-bot-20"))
            highlightSegments(20, "Lift", true);

        if ($(this).hasClass( "freq-10"))
            highlightSegments(10, "Frequency");

        if ($(this).hasClass( "freq-20"))
            highlightSegments(20, "Frequency");
    }
});

$(".filter").on("mouseleave", function(e) {
    svg.selectAll(".dot")
        .classed("diminish", false);
});

function highlightSegments(count, property, reverse){
    var toClass;
    if(!topObject[count+property+reverse]){
        toClass = _segments.slice(0);
            toClass = toClass.sort(function(a,b) {
            if(reverse) {
                return parseFloat(a[property]) - parseFloat(b[property]);
            }
            return parseFloat(b[property]) - parseFloat(a[property]);
        });

        toClass = toClass.splice(0, count);
    } else {
        toClass = topObject[count+property+reverse];
    }
    var dot = svg.selectAll(".dot")
        .classed("diminish", function(d) {
           for (var i=0; i<toClass.length; i++){
                if (d.NodeID === toClass[i].NodeID)
                    return false;
           }
           return true;
        });
}

function filterSegments(count, property, reverse) {
    if(!topObject[count+property+reverse]){
        segments = _segments.slice(0, _segments.length);
        segments = segments.sort(function(a,b) {
            if(reverse) {
                return parseFloat(a[property]) - parseFloat(b[property]);
            }
            return parseFloat(b[property]) - parseFloat(a[property]);
        });
        segments = segments.splice(0, count);
        topObject[count+property+reverse] = segments.slice(0);
    } else {
        segments = topObject[count+property+reverse].slice(0);   
    }
}

