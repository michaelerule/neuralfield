


/** 
 * Parse a description of model controls embedded in HTML. 
 * This is a brittle parser -- a stopgap on the way to something 
 * more elegant.
 * 
 * grabs div by id 'controlgroups' and converts it to HTML
 * 
 * returns a name-->value mapping of initial variable values
 */
function interpret_abbreviated_controls() {
    var controls = document.getElementById("controlgroups");
    var as_string = controls.innerHTML;
    var lines = as_string.split('\n');
    var nlines = lines.length;
    var parsed = ''; // auto-generated HTML for control elements
    var variables = {}; // name--> value mapping
    // This implementation is a state machine
    // TODO: make a proper DSL and get a parsing library
    // suggest starting here http://marijnhaverbeke.nl/blog/acorn.html
    var in_parameter_group = false;
    for (var i=0; i<nlines; i++) {
        var line = lines[i];
        var words = line.match(/\S+/g);
        if (!words) continue;
        var nwords = words.length;
        if (nwords<1) continue;
        var verb = words[0]
        switch(verb) {
            case 'pargroup':
                // begin a parameter group
                if (in_parameter_group) {
                    // need to close group
                    parsed += '</div>';
                    in_parameter_group = false;
                }
                var groupname = words.slice(1).join(' ');
                parsed += '<div class="controls">'+groupname;
                break;
            case 'par':
                if (!words.length>=3) {
                    console.log('Error in parameter line '+i);
                    console.log(line);
                    console.log('Parameter declarations consist of a name, value, displayed name, minimum range, maximum range, and step size');
                }
                var varname  = words[1];
                var value    = eval(words[2]) || 0;
                var varmin   = words[4] || null;
                var varmax   = words[5] || null;
                parsed += '<div class="control">'+(words[3] || varname);
                parsed += '<input type="number" ';
                parsed += 'name="'+varname+'" ';
                parsed += 'value="'+value+'" ';
                parsed += 'step="'+(words[6] || 0.1)+'" ';
                if (varmin) parsed += 'min="'+varmin+'" ';
                if (varmax) parsed += 'max="'+varmax+'" ';
                parsed += '/>';
                parsed += '</div>';         
                
                variables[varname]=value;
                break;       
        }
    }
    if (in_parameter_group) {
        // need to close group
        parsed += '</div>';
        in_parameter_group = false;
    }
    controls.innerHTML = parsed;
    console.log(variables);
    return variables;
}
