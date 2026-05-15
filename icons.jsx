// Minimal stroke icons — 16px viewBox
const Icon = ({ d, size = 14, fill = "none", stroke = "currentColor", sw = 1.5, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const Icons = {
  Switch: <Icon d={["M2 5h12v3H2z", "M2 8v3h12V8", "M4.5 5v-1", "M7.5 5v-1", "M10.5 5v-1", "M13.5 5v-1"]} />,
  Router: <Icon d={["M2.5 9.5h11l-1.5 3h-8z", "M5 9.5V7", "M11 9.5V7", "M5 7c0-1.5 1-2.5 3-2.5s3 1 3 2.5", "M8 2v2.5"]} />,
  Firewall: <Icon d={["M2 4h12v8H2z", "M2 6.5h12", "M2 9h12", "M5 4v2.5", "M9 4v2.5", "M7 6.5V9", "M11 6.5V9", "M5 9v3", "M9 9v3"]} />,
  Reset: <Icon d={["M13 8a5 5 0 1 1-1.46-3.54", "M13 2v3.5h-3.5"]} />,
  Plus: <Icon d={["M8 3v10", "M3 8h10"]} />,
  Trash: <Icon d={["M3 4.5h10", "M6 4.5v-1.5h4v1.5", "M4.5 4.5v9h7v-9", "M7 7v4", "M9 7v4"]} />,
  Download: <Icon d={["M8 2v8.5", "M5 7.5l3 3 3-3", "M3 13.5h10"]} />,
  Upload: <Icon d={["M8 13V4.5", "M5 7.5l3-3 3 3", "M3 2.5h10"]} />,
  Copy: <Icon d={["M5 5V3h8v8h-2", "M3 5h8v8H3z"]} />,
  Save: <Icon d={["M3 3h8l2 2v8H3z", "M5 3v3.5h6V3", "M5 9.5h6V13H5z"]} />,
  Settings: <Icon d={["M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z", "M13.5 8c0-.5 0-1-.1-1.5l1.4-1-1.5-2.6-1.6.6c-.7-.6-1.5-1-2.3-1.3L9 .5H7l-.4 1.7c-.8.3-1.6.7-2.3 1.3l-1.6-.6L1.2 5.5l1.4 1c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-1.4 1L2.7 13.1l1.6-.6c.7.6 1.5 1 2.3 1.3l.4 1.7h2l.4-1.7c.8-.3 1.6-.7 2.3-1.3l1.6.6 1.5-2.6-1.4-1c.1-.5.1-1 .1-1.5z"]} />,
  Search: <Icon d={["M7.5 12.5a5 5 0 1 0 0-10 5 5 0 0 0 0 10z", "M11 11l3 3"]} />,
  Eye: <Icon d={["M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z", "M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"]} />,
  Folder: <Icon d={["M2 4h4l1.5 1.5H14v7H2z"]} />,
  Check: <Icon d={["M3.5 8.5l3 3 6-7"]} />,
  Arrow: <Icon d={["M3 8h10", "M9 4l4 4-4 4"]} />,
  Doc: <Icon d={["M3.5 2h6l3 3v9h-9z", "M9 2v3.5h3"]} />,
  Power: <Icon d={["M8 2v6", "M4.5 4.5a5 5 0 1 0 7 0"]} />,
  Globe: <Icon d={["M8 14.5A6.5 6.5 0 1 0 8 1.5a6.5 6.5 0 0 0 0 13z", "M1.5 8h13", "M8 1.5c1.8 2 2.8 4.2 2.8 6.5S9.8 12.5 8 14.5", "M8 1.5C6.2 3.5 5.2 5.7 5.2 8s1 4.5 2.8 6.5"]} />,
  Shield: <Icon d={["M8 1.5l5.5 2v4.5c0 3.5-2.5 6-5.5 6.5-3-.5-5.5-3-5.5-6.5V3.5z"]} />,
  Branch: <Icon d={["M4 2v12", "M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z", "M4 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4z", "M12 6c0 3-8 1-8 4"]} />,
  Activity: <Icon d={["M1 8h3l2-5 4 10 2-5h3"]} />,
  Layers: <Icon d={["M8 1.5l6.5 3.5L8 8.5 1.5 5z", "M1.5 8L8 11.5 14.5 8", "M1.5 11L8 14.5 14.5 11"]} />,
  Sun: <Icon d={["M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M8 1v2", "M8 13v2", "M1 8h2", "M13 8h2", "M3 3l1.4 1.4", "M11.6 11.6L13 13", "M3 13l1.4-1.4", "M11.6 4.4L13 3"]} />,
  Moon: <Icon d={["M13.5 9.5A5.5 5.5 0 1 1 6.5 2.5a4.5 4.5 0 0 0 7 7z"]} />,
};

window.Icons = Icons;
window.Icon = Icon;
