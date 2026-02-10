// Extract issue data from GitHub webhook payload
function extractIssueData(rawData) {
    let data = Array.isArray(rawData) && rawData[0]?.body ? rawData[0].body : rawData;
    const issue = data.issue || {};
    
    const extracted = {
        title: issue.title,
        number: issue.number,
        fullDescription: issue.body || '',
        status: issue.state,
        author: issue.user?.login,
        repo: data.repository?.full_name,
        url: issue.html_url,
        created: issue.created_at,
        labels: issue.labels?.map(l => l.name).join(', ') || 'none',
        assignees: issue.assignees?.map(a => a.login).join(', ') || 'none',
        comment: data.comment?.body || ''
    };


    return extracted;
}

// Parse comment references for "pt" entries
function parseCommentReferences(items) {
    for (const item of items) {
        const commentBody = item.json?.body?.comment?.body || item.json?.body || '';
        
        if (!commentBody || !commentBody.toLowerCase().includes('pt')) {
          
            return { foundEntries: [], message: 'No "pt" found in comment', status: false };
        }

        const foundEntries = [];
        const regex = /(?:([A-Za-z0-9&\s]+?)?\s*)?(?:pt[:\-]?\s*(\d+)|(\d+)\s*pt)(?!\w)/gi;
        
        let m;
        while ((m = regex.exec(commentBody)) !== null) {
            const rawDept = m[1] ? m[1].trim() : null;
            const num = m[2] || m[3];
            const noise = ['and', 'for', 'also'];
            const dept = rawDept && !noise.includes(rawDept.toLowerCase()) ? rawDept : null;
            foundEntries.push({ dept, num, comment: commentBody });
        }

        if (foundEntries.length > 0) {
            return { foundEntries, message: 'Entries successfully parsed', status: true };
        }
    }
    return { foundEntries: [], message: 'No valid entries found', status: false };
}

module.exports = {
    extractIssueData,
    parseCommentReferences
};