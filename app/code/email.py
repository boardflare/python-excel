import re

def extract_emails(text):
    pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(pattern, text)
    return emails

# return first email
pyout = extract_emails(data1)[0]

sample_text = """
Contact us at support@example.com or sales@company.co.uk.
For personal inquiries, reach out to john.doe@email.com.
"""

extracted_emails = extract_emails(sample_text)
print (extracted_emails)
pyout = [extracted_emails]
print (pyout)
print("Extracted email addresses:")
for email in extracted_emails:
    print(email)