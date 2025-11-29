# House Manual Data Directory

This directory contains house manual text files for each property.

## File Naming Convention

Files should be named: `prop-{property_id}_{property_name}.txt`

Examples:
- `prop-1_downtown_loft.txt`
- `prop-2_beach_house.txt`
- `prop-3_mountain_cabin.txt`

## File Format

Plain text files (.txt) with UTF-8 encoding.

Structure the content clearly with sections like:
- WELCOME
- CONTACT INFORMATION
- WI-FI & INTERNET
- TV & ENTERTAINMENT
- HEATING & COOLING
- KITCHEN APPLIANCES
- LAUNDRY
- KEYS & ACCESS
- EMERGENCIES
- COMMON QUESTIONS

## Adding New Properties

1. Create a new .txt file following the naming convention
2. Add comprehensive house manual content
3. Update `backend/app/main.py` to include the new property in `property_files` mapping
4. Restart the backend server

The RAG system will automatically:
- Load the file on startup
- Chunk the content
- Create embeddings
- Build a vector store for that property

## Tips for Good House Manuals

- Be specific and detailed
- Include step-by-step instructions
- Add troubleshooting sections
- Include common questions
- Use clear section headers
- Keep formatting consistent

