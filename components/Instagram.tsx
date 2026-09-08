import { getInstagramPosts } from '@/lib/instagram';

export default async function Instagram() {
  const posts = await getInstagramPosts();
  const perfil = process.env.NEXT_PUBLIC_INSTAGRAM_PROFILE || 'https://instagram.com/';
  if (!posts.length) return null;
  return (
    <section className="sec top0" id="instagram">
      <div className="wrap">
        <div className="cabeca">
          <h2>Instagram</h2>
          <a href={perfil} target="_blank" rel="noreferrer"><span>@ seguir o perfil</span></a>
        </div>
        <div className="insta">
          {posts.slice(0, 9).map((p) => (
            <a key={p.id} href={p.permalink} target="_blank" rel="noreferrer">
              <img src={p.media_url} alt={p.caption?.slice(0, 80) || 'Post do Instagram'} loading="lazy" />
              <span className="insta-selo">ver no instagram</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
