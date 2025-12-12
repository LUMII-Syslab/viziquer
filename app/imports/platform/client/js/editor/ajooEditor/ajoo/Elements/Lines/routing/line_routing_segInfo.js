//******************************************************************************
// SegmInfo 
//******************************************************************************
var SegmInfo = function(info) {
    this.dir = info[0];
    this.min = info[1];
    this.lev = info[2];
    this.max = info[3];
    this.ind = info[4];
    this.mark;
    this.disconnected;
    this.owner = info[5];
    // 0 - increase; 1 - decrease
    this.increase = (this.owner.lev[this.ind - 1] < this.owner.lev[this.ind + 1]) ? 0 : 1;
    this.ntype = "s";
};
SegmInfo.prototype.forward = function(boxId) {
    if (this.ind < 1 || this.ind >= this.owner.n)
        warning("SegmInfo.prototype.forvard wrong segment index " + this.ind + "; " + this.owner.toString());
    if (this.owner.from !== boxId && this.owner.to !== boxId)
        warning("SegmInfo.prototype.forvard wrong box id " + boxId);
    var rc;
    if (this.owner.isSelfloop() && this.owner.n === 2)
        rc = (this.ind === 1) === (this.increase === 1);
    else
        rc = (boxId === this.owner.from) === (this.increase === 1);
    return rc;
};
SegmInfo.prototype.direction = function() {
    var rc = (this.owner.dir + ind) & 1;
    return rc;
};
SegmInfo.prototype.level = function() {
    if (this.mark === 0)
        return this.lev;
    if (this.mark === 1)
        return this.min;
    return this.max;
};
SegmInfo.prototype.compareConn = function(segm) {
    if (this.level() < segm.level())
        return -1;
    else if (this.level() > segm.level())
        return 1;
    else if (this.mark === segm.mark)
        return 0;
    else if (this.mark > segm.mark)
        return -1;
    else
        return 1;
};
SegmInfo.prototype.intersectRect = function(r) {
    var d = 1 - this.dir;
    var rc = this.projRect(r) && this.min <= r[2 + d] && r[d] <= this.max;
    return rc;
};
SegmInfo.prototype.projRect = function(r) {
    var d = this.dir;
    var rc = (this.lev <= r[2 + d] && r[d] <= this.lev);
    return rc;
};
SegmInfo.prototype.intersectSegm = function(s) {
    var rc = false;
    if (this.dir === s.dir)
        warning("SegmInfo.prototype.projSegm: segments has same direction");
    else
        rc = this.projSegm(s) && s.projSegm(this);
    return rc;
};
SegmInfo.prototype.projSegm = function(s) {
    var rc = false;
    if (this.dir === s.dir)
        warning("SegmInfo.prototype.projSegm: segments has same direction");
    else
        rc = this.lev <= s.max && s.min <= this.lev;
    return rc;
};
SegmInfo.prototype.toString = function() {
    return "segm{" + "dir: " + this.dir + "; min: " + this.min + "; lev:" + this.lev + 
            "; max: " + this.max + "; ind: " + this.ind + "; mark: " + this.mark + 
             "; disconn: " + this.disconnected + "; myId: " + this.owner.myId + "}";
};

export default SegmInfo