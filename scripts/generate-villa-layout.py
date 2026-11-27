"""Generate collision-only map data from the untouched uploaded GLB. Usage: python generate-villa-layout.py original.glb src/lib/villa-layout.json (requires numpy)."""
import json, struct, sys
import numpy as np
f=open(sys.argv[1],'rb').read(); n=struct.unpack_from('<I',f,12)[0]; g=json.loads(f[20:20+n])
def matrix(node):
 if 'matrix' in node:return np.array(node['matrix']).reshape(4,4).T
 x,y,z,w=node.get('rotation',[0,0,0,1]); R=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
 m=np.eye(4);m[:3,:3]=R@np.diag(node.get('scale',[1,1,1]));m[:3,3]=node.get('translation',[0,0,0]);return m
import math
binary=f[28+n:]; CELL=6; SCALE=.5; OX=4.3615; OZ=5.4881; W=450; H=440
occupied=set();triangles=0
def accessor(i):
 a=g['accessors'][i];b=g['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];nc={'SCALAR':1,'VEC3':3}[a['type']];stride=b.get('byteStride',np.dtype(dt).itemsize*nc);return np.ndarray((a['count'],nc),dtype=dt,buffer=binary,offset=b.get('byteOffset',0)+a.get('byteOffset',0),strides=(stride,np.dtype(dt).itemsize))
def walk(i,parent):
 global triangles
 node=g['nodes'][i];m=parent@matrix(node)
 if 'mesh' in node:
  for p in g['meshes'][node['mesh']]['primitives']:
   v=accessor(p['attributes']['POSITION']);v=(np.c_[v,np.ones(len(v))]@m.T)[:,:3]*SCALE;v[:,0]+=OX;v[:,2]+=OZ
   ix=accessor(p['indices']).reshape(-1) if 'indices' in p else np.arange(len(v));triangles+=len(ix)//3
   for ids in ix.reshape(-1,3):
    t=v[ids];lo=t[:,1].min();hi=t[:,1].max()
    if hi<.12 or lo>1.55:continue
    for height in [.18,.4,.65,.8,1.05,1.35]:
     if not lo<=height<=hi:continue
     pts=[]
     for a,b in [(t[0],t[1]),(t[1],t[2]),(t[2],t[0])]:
      if (a[1]<=height<b[1]) or (b[1]<=height<a[1]):
       q=a+(b-a)*(height-a[1])/(b[1]-a[1]);pts.append(q[[0,2]]*50)
     if len(pts)==2:
      a,b=pts;steps=max(1,math.ceil(np.linalg.norm(b-a)/(CELL/3)))
      for q in np.linspace(a,b,steps+1):
       x,y=map(lambda n:math.floor(n/CELL),q)
       if 0<=x<math.ceil(W/CELL) and 0<=y<math.ceil(H/CELL):occupied.add((x,y))
 for j in node.get('children',[]):walk(j,m)
for i in g['scenes'][g.get('scene',0)]['nodes']:walk(i,np.eye(4))
rects=[]; active={}
for y in range(math.ceil(H/CELL)):
 xs=sorted(x for x,yy in occupied if yy==y);runs=[]
 for x in xs:
  if runs and x==runs[-1][1]+1:runs[-1]=(runs[-1][0],x)
  else:runs.append((x,x))
 new={}
 for run in runs:
  if run in active:r=active[run];r['h']+=CELL
  else:r={'x':run[0]*CELL,'y':y*CELL,'w':(run[1]-run[0]+1)*CELL,'h':CELL};rects.append(r)
  new[run]=r
 active=new
# Exact native floor bounds, invisible outer collision only.
rects += [{'x':0,'y':0,'w':450,'h':20},{'x':0,'y':402.7,'w':450,'h':37.3},{'x':0,'y':20,'w':20,'h':383},{'x':416.15,'y':20,'w':33.85,'h':383}]
def hits(x,y,r=18):
 for b in rects:
  nx=max(b['x'],min(x,b['x']+b['w']));ny=max(b['y'],min(y,b['y']+b['h']))
  if (x-nx)**2+(y-ny)**2<r*r:return True
 return False
cells={(x,y) for x in range(7,69) for y in range(7,67) if not hits(x*CELL,y*CELL)}
def coord(x,z):return {'x':round((x*SCALE+OX)*50,2),'y':round((z*SCALE+OZ)*50,2)}
start=coord(-1,-1.7);start=min(cells,key=lambda a:(a[0]*CELL-start['x'])**2+(a[1]*CELL-start['y'])**2)
visited={start};stack=[start]
while stack:
 x,y=stack.pop()
 for a in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
  if a in cells and a not in visited:visited.add(a);stack.append(a)
def nearest(x,z):
 p=coord(x,z);q=min(visited,key=lambda a:(a[0]*CELL-p['x'])**2+(a[1]*CELL-p['y'])**2);return {'x':q[0]*CELL,'y':q[1]*CELL}
layout={'scale':SCALE,'offset':{'x':OX,'z':OZ},'world':{'w':W,'h':H},'floor':{'x':20,'y':20,'w':396.15,'h':382.7},'sourceMeshCount':86,'sourceTriangles':triangles,'walls':rects,'spawns':[nearest(-1,-1.7),nearest(-2,-1.7),nearest(-1,-2.8)],'ghost':nearest(1,-8),'keys':[dict(id=i,name=name,**nearest(x,z)) for i,(name,x,z) in enumerate([('Kunci Meja Tamu',-3.3,.8),('Kunci Meja Makan',3.6,-2.8),('Kunci Credenza',1.4,-9),('Kunci Sofa',-4.8,3.4),('Kunci Dekat Tanaman',.9,4.3)])],'batteries':[dict(id=i,**nearest(x,z)) for i,(x,z) in enumerate([(-2,-3),(5,3),(-6,0),(0,-7),(6,-4),(-4,4)])],'exit':dict(**nearest(5.9,-4.3),r=38),'patrol':[list(nearest(x,z).values()) for x,z in [(-1,-1.7),(1,-4),(1,-8),(-4,-7),(-5,-1),(-3,1),(0,2),(5,3),(6,-3)]]}
open(sys.argv[2],'w').write(json.dumps(layout,indent=2))
print('triangles',triangles,'collider rectangles',len(rects),'connected walkable cells',len(visited),'of',len(cells));print('keys',layout['keys']);print('spawn',layout['spawns'])
