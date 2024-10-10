import sys
import numpy as np

# Load example data for testing
if sys.platform != 'emscripten':
    data1 = np.array([[2]], dtype=np.int64)

print(f"data1: {data1} data2: {data2}")
pyout = np.array([[2]], dtype=np.int64)