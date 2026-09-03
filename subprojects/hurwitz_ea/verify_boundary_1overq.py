#!/usr/bin/env python3
# X-boundary-closedform: 1/q 法則 (corollary) を census 実測と照合 (offline)
import json,os,sympy as sp
from sympy import Rational, divisors, mobius
def Nq(q,e): return sum(mobius(e//d)*q**d for d in divisors(e))//e
def Mg(q,g): return Rational(-1,q-1)+q**(-g)*sum(e*Nq(q,e)*Rational(1,q**e+1) for e in divisors(g))
q=3; base=os.path.dirname(__file__)
cen={}
for g in (5,6,7):
    f=os.path.join(base,"ea_d%d_aggregates.json"%(2*g+1))
    if os.path.exists(f):
        j=json.load(open(f)); cen[g]=j.get("boundary_excess_n2g",j.get("boundary_excess"))
ok=True
for g in sorted(cen):
    O=cen[g]-float(Mg(q,g)); pred=1.0/((q-1)*q**g); ok&=abs(O/pred-1)<0.15
print("closedform_vs_census(1/q law):", "match" if ok else "MISMATCH")
