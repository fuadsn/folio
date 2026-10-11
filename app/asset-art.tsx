import type { Kind } from "../lib/world";
export default function AssetArt({
  kind,
  color = "#b3a3d5",
}: {
  kind: Kind;
  color?: string;
}) {
  const nature = ["tree", "pine", "palm", "rock", "flowers", "pond"].includes(
    kind,
  );
  return (
    <svg viewBox="0 0 120 95" fill="none" aria-hidden="true">
      <ellipse cx="60" cy="81" rx="35" ry="8" fill="#263730" opacity=".08" />
      {kind === "driftcar" ? (
        <>
          <path d="m15 61 32-24 38-8 22 24-8 19-57 17-27-13Z" fill={color} />
          <path d="m47 38 25-6 17 16-30 10Z" fill="#292323" />
          <path d="m48 41 22-5 11 12-24 8Z" fill="#47636a" />
          <path d="m16 63 40 10 43-13-1 12-56 17-27-13Z" fill="#292323" />
          <path d="m16 61 25-17 15 18-30 10Z" fill="#292323" />
          <path d="m86 35 2-10m15 20 2-12" stroke="#292323" strokeWidth="4" />
          <path d="m76 23 18-5 21 14-19 6Z" fill="#292323" />
          <ellipse cx="43" cy="76" rx="8" ry="10" fill="#292323" />
          <ellipse cx="90" cy="65" rx="8" ry="10" fill="#292323" />
          <ellipse cx="43" cy="76" rx="5" ry="6" fill="#e7d4b3" />
          <ellipse cx="90" cy="65" rx="5" ry="6" fill="#e7d4b3" />
          <path d="m16 63 10 3m7 2 10 3" stroke="#fff1cc" strokeWidth="3" />
          <path
            d="m8 81 17 5m-10-2 10 5"
            stroke="#86664c"
            strokeWidth="2"
            strokeLinecap="round"
            opacity=".5"
          />
        </>
      ) : kind === "car" ? (
        <>
          <path d="m24 52 7-14 37-10 21 14 10 23-59 17-19-14Z" fill={color} />
          <path d="m37 38 29-8 15 12-31 9Z" fill="#fef3e2" />
          <path d="m39 41 24-6 10 9-25 7Z" fill="#7ba7ae" />
          <path d="m50 55 49-13v24L49 81Z" fill="#2a1a0e" opacity=".15" />
          <ellipse cx="42" cy="72" rx="8" ry="11" fill="#2a1a0e" />
          <ellipse cx="85" cy="61" rx="8" ry="11" fill="#2a1a0e" />
          <ellipse cx="43" cy="72" rx="3" ry="5" fill="#fef3e2" />
          <ellipse cx="86" cy="61" rx="3" ry="5" fill="#fef3e2" />
          <path d="m23 56 16 8v7l-16-8Z" fill="#ffe3a5" />
        </>
      ) : kind === "boat" ? (
        <>
          <path d="m17 61 58-25 30 18-9 20-41 9-25-8Z" fill={color} />
          <path d="m17 61 58-25 30 18-50 20Z" fill="#fef3e2" />
          <path d="m38 58 36-15 18 10-35 13Z" fill={color} />
          <path d="m57 49 22-8-4-17-22 8Z" fill="#7ba7ae" />
          <path d="m52 31 22-8" stroke="#2a1a0e" strokeWidth="3" />
          <path
            d="m19 82 22 5m36-1 22-5"
            stroke="#7ba7ae"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : kind === "plane" ? (
        <>
          <path d="m34 72 14-29 26-16 13 8-17 29-24 18Z" fill={color} />
          <path d="m15 32 78 29-5 10-75-25Z" fill="#f4ae52" />
          <path d="m33 68 25 10-5 7-28-8Z" fill="#fef3e2" />
          <path d="m58 41 10-10 9 7-10 10Z" fill="#7ba7ae" />
          <path
            d="m74 17 18 27"
            stroke="#2a1a0e"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="m30 69 5-15 10 17Z" fill={color} />
          <circle cx="45" cy="77" r="4" fill="#2a1a0e" />
          <circle cx="75" cy="61" r="4" fill="#2a1a0e" />
        </>
      ) : nature ? (
        kind === "rock" ? (
          <>
            <path d="m30 76 8-30 23-8 25 16 8 22-33 9Z" fill={color} />
            <path d="m38 46 23-8 25 16-25 10Z" fill="#d4d6c6" />
            <path d="m61 64 25-10 8 22-33 9Z" fill="#83918a" />
          </>
        ) : kind === "pond" ? (
          <>
            <ellipse cx="60" cy="70" rx="43" ry="15" fill="#c7c5ad" />
            <ellipse cx="60" cy="68" rx="37" ry="12" fill={color} />
            <path d="m37 66 20 4 21-5" stroke="#dbeddf" strokeWidth="2" />
          </>
        ) : kind === "flowers" ? (
          <>
            {[35, 58, 82].map((x, i) => (
              <g key={x}>
                <path
                  d={`M${x} 79V${40 + i * 8}`}
                  stroke="#7e9772"
                  strokeWidth="3"
                />
                <circle cx={x} cy={38 + i * 8} r="12" fill={color} />
                <circle cx={x} cy={38 + i * 8} r="4" fill="#f5df92" />
              </g>
            ))}
          </>
        ) : (
          <>
            <path d="M57 50h7v30l-7 2z" fill="#a88162" />
            {kind === "pine" ? (
              <>
                <path d="m60 14 28 43H32Z" fill={color} />
                <path d="m60 30 32 38H28Z" fill={color} />
                <path d="m60 14 28 43H60Z" fill="#416b60" opacity=".3" />
              </>
            ) : (
              <>
                <path
                  d="m36 24 28-9 25 18 2 25-24 14-32-12-10-21Z"
                  fill={color}
                />
                <path
                  d="m64 15 25 18 2 25-24 14-1-32Z"
                  fill="#345d45"
                  opacity=".17"
                />
                <path d="m36 24 28-9 2 25-41-1Z" fill="#fff" opacity=".18" />
              </>
            )}
          </>
        )
      ) : ["cube", "sphere", "cone", "platform", "custom"].includes(kind) ? (
        kind === "sphere" ? (
          <>
            <circle cx="60" cy="49" r="30" fill={color} />
            <path
              d="M40 26c-2 31 14 44 42 42-33 34-66-6-42-42"
              fill="#000"
              opacity=".1"
            />
          </>
        ) : kind === "cone" ? (
          <path d="M60 16 24 72q34 18 72 0Z" fill={color} />
        ) : (
          <>
            <path d="m25 37 35-18 35 18-35 20Z" fill={color} />
            <path d="m25 37 35 20v28L25 66Z" fill={color} />
            <path d="m60 57 35-20v29L60 85Z" fill={color} />
            <path d="m60 57 35-20v29L60 85Z" fill="#000" opacity=".18" />
          </>
        )
      ) : ["bench", "sign", "mailbox", "lamp", "flag"].includes(kind) ? (
        kind === "bench" ? (
          <>
            <path d="m24 57 51-14 24 16-51 16Z" fill={color} />
            <path d="M24 39 75 25v17L24 56Z" fill={color} />
            <path
              d="m28 64 1 16m53-17 2 14m-48-28 1 15m47-24 1 18"
              stroke="#4b5551"
              strokeWidth="4"
            />
          </>
        ) : kind === "lamp" ? (
          <>
            <path d="M61 29v52" stroke="#495653" strokeWidth="5" />
            <path d="m45 27 16-9 16 9v22l-16 7-16-8Z" fill={color} />
            <path d="m41 25 20-14 20 14-20 7Z" fill="#53605a" />
          </>
        ) : (
          <>
            <path d="M43 51v31m35-39v31" stroke="#a88162" strokeWidth="5" />
            <path d="m28 27 61-16v41L28 68Z" fill={color} />
            <path d="m35 32 47-12v26L35 59Z" fill="#f3ead9" />
            <path
              d="m43 37 30-7m-30 16 21-5"
              stroke="#a4947e"
              strokeWidth="3"
            />
          </>
        )
      ) : (
        <>
          <path d="m22 70 37-18 42 20-39 18Z" fill="#d8cdbb" />
          <path d="m29 36 30-16 35 18v34L62 86 29 69Z" fill="#f0e6d2" />
          <path d="m62 52 32-14v34L62 86Z" fill="#d9cbb4" />
          {kind === "observatory" ? (
            <path d="M25 41C23 5 91-3 97 38L62 55Z" fill={color} />
          ) : kind === "tower" ? (
            <>
              <path d="m43 26 18-9 18 9v-5L62 2 43 20Z" fill={color} />
              <path d="m44 24 18 9 17-7v25L61 60 44 48Z" fill={color} />
            </>
          ) : (
            <>
              <path d="m20 39 36-29 49 28-39 20Z" fill={color} />
              <path d="m20 39 36-29 9 48Z" fill="#fff" opacity=".15" />
            </>
          )}
          <path d="m40 51 11 5v17l-11-5Z" fill="#698887" />
          <path d="m72 55 10-4v11l-10 5Z" fill="#769a9e" />
          <path d="m38 42 7 3v7l-7-3Z" fill="#eddbb6" />
        </>
      )}
    </svg>
  );
}
