```python
from js import eval as js_eval
from pyodide.ffi import create_proxy

def setup_db():
    # Initialize IndexedDB
    db_init = """
    let db;
    const request = indexedDB.open('CalcDB', 1);
    
    request.onerror = (event) => {
        console.error('Database error:', event.target.error);
    };
    
    request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (!db.objectStoreNames.contains('calculations')) {
            db.createObjectStore('calculations', { keyPath: 'id', autoIncrement: true });
        }
    };
    """
    js_eval(db_init)

def add_numbers():
    # Use JavaScript to perform addition and save to IndexedDB
    js_code = """
    async function addAndStore() {
        const result = 2 + 2;
        
        // Open DB connection
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('CalcDB', 1);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        // Store result
        const tx = db.transaction('calculations', 'readwrite');
        const store = tx.objectStore('calculations');
        await store.add({
            calculation: '2 + 2',
            result: result,
            timestamp: new Date()
        });
        
        return result;
    }
    addAndStore();
    """
    return js_eval(js_code)

# Initialize database
setup_db()

# Run and print result
print(f"2 + 2 = {add_numbers()}")
```