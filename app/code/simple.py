import sys

# Load example data for testing
if sys.platform != 'emscripten':
    data1 = [[2]]
    data2 = [[3]]
    print(f"data1: {data1}, data2: {data2}")

    # Perform element-wise addition
pyout = [[data1[0][0] + data2[0][0]]]
print(pyout)