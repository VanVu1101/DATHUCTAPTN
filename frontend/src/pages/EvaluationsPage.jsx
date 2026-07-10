import '../App.css';
import { useEffect, useState } from 'react';
import { getMyEvaluation, getEvaluationByInternship, submitEvaluation } from '../services/evaluationService';

function EvaluationsPage() {
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [internshipIdInput, setInternshipIdInput] = useState('');
  const [scoreInput, setScoreInput] = useState(8.0);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setUserRole(u?.role || null);
      } catch (e) {}
    }

    const load = async () => {
      setLoading(true);
      try {
        const res = await getMyEvaluation();
        if (res?.success) setEvaluation(res.data || null);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const loadByInternship = async (id) => {
    setLoading(true);
    try {
      const res = await getEvaluationByInternship(id);
      if (res?.success) setEvaluation(res.data || null);
    } catch (e) {
      setEvaluation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!internshipIdInput) return alert('Nhập internshipId');
    try {
      const res = await submitEvaluation(Number(internshipIdInput), { score: Number(scoreInput), feedback: feedbackInput });
      if (res?.success) {
        alert('Đã lưu đánh giá');
        setEvaluation(res.data || null);
      }
    } catch (e) {
      alert('Lỗi khi lưu đánh giá');
    }
  };

  return (
    <div className="page-shell">
      <h1>Đánh giá</h1>

      <div className="card">
        {loading ? (
          <div>Đang tải...</div>
        ) : (
          <>
            {evaluation ? (
              <div>
                <div style={{display:'flex',alignItems:'center',gap:20}}>
                  <div style={{width:110,height:110,borderRadius:999,background:'#fff4f0',display:'grid',placeItems:'center',fontSize:28,fontWeight:800}}>
                    {Number(evaluation.score ?? (evaluation?.criteria ? (Object.values(evaluation.criteria).reduce((s,v)=>s+(v.score||0),0)/Object.values(evaluation.criteria).length) : 0)).toFixed(1)}
                    <div style={{fontSize:12,color:'#64748b'}}>/10</div>
                  </div>
                  <div>
                    <h3>Nhận xét</h3>
                    <p style={{color:'#334155'}}>{evaluation.feedback || 'Không có nhận xét'}</p>
                  </div>
                </div>
                {evaluation.criteria && (
                  <div style={{marginTop:16,display:'grid',gap:8}}>
                    {Array.isArray(evaluation.criteria) ? evaluation.criteria.map((c,idx)=> (
                      <div key={idx} style={{display:'flex',alignItems:'center',gap:12}}>
                        <div style={{flex:1}}>
                          <div style={{height:10,background:'#f1f5f9',borderRadius:8,overflow:'hidden'}}>
                            <div style={{width:`${Math.round((c.score/c.max)*100)}%`,height:'100%',background:'#10b981'}} />
                          </div>
                        </div>
                        <div style={{width:48,textAlign:'right'}}>{c.score}/{c.max}</div>
                        <div style={{width:200,color:'#64748b',paddingLeft:8}}>{c.label}</div>
                      </div>
                    )) : null}
                  </div>
                )}
              </div>
            ) : (
              <div>Chưa có đánh giá cho bạn.</div>
            )}
          </>
        )}
      </div>

      {userRole === 'ADMIN' && (
        <div className="card" style={{marginTop:16}}>
          <h3>Chấm tay (Admin)</h3>
          <div style={{display:'grid',gap:8}}>
            <input placeholder="internshipId" value={internshipIdInput} onChange={(e)=>setInternshipIdInput(e.target.value)} />
            <label>Score (0-10)</label>
            <input type="number" min="0" max="10" step="0.1" value={scoreInput} onChange={(e)=>setScoreInput(e.target.value)} />
            <label>Feedback</label>
            <textarea value={feedbackInput} onChange={(e)=>setFeedbackInput(e.target.value)} />
            <div style={{display:'flex',gap:8}}>
              <button className="btn" onClick={handleSubmit}>Lưu</button>
              <button className="btn outline" onClick={()=>loadByInternship(internshipIdInput)}>Nạp đánh giá</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EvaluationsPage;
