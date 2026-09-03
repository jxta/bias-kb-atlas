#!/usr/bin/env python3
# X-a1-mobius: A_1 Mobius 閉形式の documented 値照合 (offline, o29 §1)
import sympy as sp
from sympy import mobius, divisors
def emS(q,e):
    m=e//2; odd=m
    while odd%2==0: odd//=2
    return sum(mobius(d)*q**(m//d) for d in divisors(odd)) - (1 if (m&(m-1))==0 else 0)
q=3; exp={6:q**3-q,12:q**6-q**2,16:q**8-1,30:q**15-q**5-q**3+q}
ok=all(emS(q,e)==v for e,v in exp.items())
print("A1_closedform_match:", "match" if ok else "MISMATCH")
