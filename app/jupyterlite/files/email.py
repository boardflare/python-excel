import re

data1 = """
Contact us at support3@example.com or sales@company.co.uk.
For personal inquiries, reach out to john.doe@email.com.
"""

def extract_emails(text):
    pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(pattern, text)
    return emails

extracted_emails = extract_emails(data1)

if extracted_emails:
    pyout = extracted_emails[0]
else:
    pyout = "no emails"


