const styles = {
    container: {
        height: '150px',
        backgroundColor: '#000',
        color: '#fff',
        fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
        fontSize: '13px',
        padding: '10px',
        overflowY: 'auto',
        borderTop: '2px solid #333',
        display: 'flex',
        flexDirection: 'column',
    },
    title: {
        color: '#888',
        fontSize: '11px',
        marginBottom: '5px',
        textTransform: 'uppercase',
        borderBottom: '1px solid #333',
        paddingBottom: '2px'
    },
    output: {
        whiteSpace: 'pre-wrap',
        flex: 1
    },
    closeBtn: {
        float: 'right',
        cursor: 'pointer',
        color: '#ff5f56'
    }
};

export default function Terminal({ output, onClose, isOpen }) {
    if (!isOpen) return null;

    return (
        <div style={styles.container}>
            <div style={styles.title}>
                Terminal Output
                <span style={styles.closeBtn} onClick={onClose}> [x] </span>
            </div>
            <div style={styles.output}>
                {output || <span style={{color: '#666'}}>Running...</span>}
            </div>
        </div>
    );
}