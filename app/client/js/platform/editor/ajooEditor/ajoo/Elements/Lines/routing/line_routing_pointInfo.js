//******************************************************************************
// PointInfo 
//******************************************************************************
var PointInfo = function(info) {
    this.c = [info[0], info[1]];
    this.ind = info[2];
    this.ntype = "p";
};
PointInfo.prototype.inside = function(r) {
    var rc = this.proj(r, 0) && this.proj(r, 1);
    return rc;
};
PointInfo.prototype.proj = function(r, dir) {
    var rc = r[dir] <= this.c[dir] && this.c[dir] <= r[2 + dir];
    return rc;
};
PointInfo.prototype.toString = function() {
    return "point{" + "[" + this.c[0] + ", " + this.c[1] + "]; ind:" + this.ind + "}";
};

export default PointInfo