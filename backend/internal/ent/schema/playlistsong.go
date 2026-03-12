package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// PlaylistSong 播放清單歌曲關聯資料表 schema 定義
type PlaylistSong struct {
	ent.Schema
}

// Annotations 設定資料表名稱為 playlist_songs
func (PlaylistSong) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "playlist_songs"},
	}
}

// Fields 定義 playlist_songs 資料表欄位
func (PlaylistSong) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.UUID("playlist_id", uuid.UUID{}),
		field.UUID("song_id", uuid.UUID{}),
		field.Int("order_index"),
		field.Time("added_at").
			Default(time.Now).
			SchemaType(map[string]string{
				dialect.Postgres: "timestamptz",
			}).
			Immutable(),
	}
}

// Indexes 定義 playlist_songs 的索引
func (PlaylistSong) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("playlist_id", "song_id", "order_index").
			Unique(),
	}
}

// Edges 定義 PlaylistSong 的關聯
func (PlaylistSong) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("playlist", Playlist.Type).
			Ref("playlist_songs").
			Field("playlist_id").
			Required().
			Unique(),
		edge.From("song", Song.Type).
			Ref("playlist_songs").
			Field("song_id").
			Required().
			Unique(),
	}
}
